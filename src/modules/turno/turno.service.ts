import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TurnoService {
  constructor(private prisma: PrismaService) {}

  async findDisponiblesByComplejo(complejoId: string) {
    return this.prisma.turno.findMany({
      where: {
        estado: 'DISPONIBLE',
        cancha: { complejoId },
        fechaHoraInicio: { gte: new Date() },
      },
      include: { cancha: true },
      orderBy: { fechaHoraInicio: 'asc' },
    });
  }

  async findByComplejo(complejoId: string) {
    return this.prisma.turno.findMany({
      where: { cancha: { complejoId } },
      include: { cancha: true, reserva: { include: { usuario: true } } },
      orderBy: { fechaHoraInicio: 'asc' },
    });
  }

  async create(complejoId: string, data: {
    canchaId: string;
    fechaHoraInicio: string;
    fechaHoraFin: string;
    precio: number;
  }) {
    const cancha = await this.prisma.cancha.findFirst({
      where: { id: data.canchaId, complejoId },
    });
    if (!cancha) throw new NotFoundException('Cancha no encontrada');

    const conflicto = await this.prisma.turno.findFirst({
      where: {
        canchaId: data.canchaId,
        estado: { not: 'CANCELADO' },
        OR: [
          {
            fechaHoraInicio: { lte: new Date(data.fechaHoraInicio) },
            fechaHoraFin: { gt: new Date(data.fechaHoraInicio) },
          },
          {
            fechaHoraInicio: { lt: new Date(data.fechaHoraFin) },
            fechaHoraFin: { gte: new Date(data.fechaHoraFin) },
          },
        ],
      },
    });
    if (conflicto) throw new BadRequestException('Ya existe un turno en ese horario');

    return this.prisma.turno.create({
      data: {
        canchaId: data.canchaId,
        fechaHoraInicio: new Date(data.fechaHoraInicio),
        fechaHoraFin: new Date(data.fechaHoraFin),
        precio: data.precio,
      },
      include: { cancha: true },
    });
  }

  async cancelar(id: string, complejoId: string) {
    const turno = await this.prisma.turno.findFirst({
      where: { id, cancha: { complejoId } },
    });
    if (!turno) throw new NotFoundException('Turno no encontrado');
    if (turno.estado === 'CANCELADO') throw new BadRequestException('El turno ya está cancelado');

    return this.prisma.turno.update({
      where: { id },
      data: { estado: 'CANCELADO' },
    });
  }
}