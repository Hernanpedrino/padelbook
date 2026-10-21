import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { verificarCanchaLibre } from '../../common/agenda';
import { complejoVisible, usuarioContactoSelect } from '../../common/selects';
import { validarFecha } from '../../common/validacion';
import { NotificacionService, fechaCorta } from '../notificacion/notificacion.service';

@Injectable()
export class TurnoService {
  constructor(
    private prisma: PrismaService,
    private notificaciones: NotificacionService,
  ) {}

  async findDisponiblesByComplejo(complejoId: string) {
    return this.prisma.turno.findMany({
      where: {
        estado: 'DISPONIBLE',
        cancha: { complejoId, activa: true, complejo: complejoVisible },
        fechaHoraInicio: { gte: new Date() },
      },
      include: { cancha: true },
      orderBy: { fechaHoraInicio: 'asc' },
    });
  }

  async findByComplejo(complejoId: string) {
    return this.prisma.turno.findMany({
      where: { cancha: { complejoId } },
      include: { cancha: true, reserva: { include: { usuario: { select: usuarioContactoSelect } } } },
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

    const inicio = validarFecha(data.fechaHoraInicio, 'fechaHoraInicio');
    const fin = validarFecha(data.fechaHoraFin, 'fechaHoraFin');
    await verificarCanchaLibre(this.prisma, data.canchaId, inicio, fin);

    return this.prisma.turno.create({
      data: {
        canchaId: data.canchaId,
        fechaHoraInicio: inicio,
        fechaHoraFin: fin,
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

    // Se leen antes de cancelar para saber a quién avisar
    const [reserva, partidos, cancha] = await Promise.all([
      this.prisma.reserva.findFirst({ where: { turnoId: id, estado: 'CONFIRMADA' } }),
      this.prisma.partido.findMany({ where: { turnoId: id, estado: { in: ['ABIERTO', 'COMPLETO'] } }, select: { id: true } }),
      this.prisma.cancha.findUnique({ where: { id: turno.canchaId }, include: { complejo: true } }),
    ]);

    const [turnoCancelado] = await this.prisma.$transaction([
      this.prisma.turno.update({
        where: { id },
        data: { estado: 'CANCELADO' },
      }),
      this.prisma.reserva.updateMany({
        where: { turnoId: id, estado: 'CONFIRMADA' },
        data: { estado: 'CANCELADA' },
      }),
      this.prisma.partido.updateMany({
        where: { turnoId: id, estado: { in: ['ABIERTO', 'COMPLETO'] } },
        data: { estado: 'CANCELADO' },
      }),
    ]);

    await this.notificaciones.partidosCancelados(partidos.map((p) => p.id), 'el complejo canceló el turno');
    if (reserva) {
      await this.notificaciones.notificar([reserva.usuarioId], {
        tipo: 'TURNO_CANCELADO',
        titulo: 'El complejo canceló tu reserva',
        cuerpo: `${cancha?.complejo.nombre ?? 'El complejo'} canceló tu turno del ${fechaCorta(turno.fechaHoraInicio)} en la ${cancha?.nombre ?? 'cancha'}`,
        refId: reserva.id,
      });
    }
    return turnoCancelado;
  }
}