import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReservaService {
  constructor(private prisma: PrismaService) {}

  async crear(usuarioId: string, turnoId: string) {
    const turno = await this.prisma.turno.findUnique({
      where: { id: turnoId },
    });
    if (!turno) throw new NotFoundException('Turno no encontrado');
    if (turno.estado !== 'DISPONIBLE') throw new BadRequestException('El turno no está disponible');

    const [reserva] = await this.prisma.$transaction([
      this.prisma.reserva.create({
        data: { turnoId, usuarioId },
        include: { turno: { include: { cancha: { include: { complejo: true } } } } },
      }),
      this.prisma.turno.update({
        where: { id: turnoId },
        data: { estado: 'RESERVADO' },
      }),
    ]);

    return reserva;
  }

  async cancelar(id: string, usuarioId: string) {
    const reserva = await this.prisma.reserva.findFirst({
      where: { id, usuarioId },
    });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');
    if (reserva.estado === 'CANCELADA') throw new BadRequestException('La reserva ya está cancelada');

    const [reservaActualizada] = await this.prisma.$transaction([
      this.prisma.reserva.update({
        where: { id },
        data: { estado: 'CANCELADA' },
      }),
      this.prisma.turno.update({
        where: { id: reserva.turnoId },
        data: { estado: 'DISPONIBLE' },
      }),
    ]);

    return reservaActualizada;
  }

  async findByUsuario(usuarioId: string) {
    return this.prisma.reserva.findMany({
      where: { usuarioId },
      include: {
        turno: {
          include: { cancha: { include: { complejo: true } } },
        },
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async findByComplejo(complejoId: string) {
    return this.prisma.reserva.findMany({
      where: {
        turno: { cancha: { complejoId } },
        estado: 'CONFIRMADA',
      },
      include: {
        turno: { include: { cancha: true } },
        usuario: true,
      },
      orderBy: { creadoEn: 'desc' },
    });
  }
}