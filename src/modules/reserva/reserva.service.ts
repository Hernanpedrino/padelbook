import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { complejoVisible, usuarioContactoSelect } from '../../common/selects';
import { NotificacionService } from '../notificacion/notificacion.service';

@Injectable()
export class ReservaService {
  constructor(
    private prisma: PrismaService,
    private notificaciones: NotificacionService,
  ) {}

  async crear(usuarioId: string, turnoId: string) {
    const turno = await this.prisma.turno.findFirst({
      where: { id: turnoId, cancha: { complejo: complejoVisible } },
    });
    if (!turno) throw new NotFoundException('Turno no encontrado');
    if (turno.estado !== 'DISPONIBLE') throw new BadRequestException('El turno no está disponible');

    return this.prisma.$transaction(async (tx) => {
      // Marcar el turno solo si sigue DISPONIBLE evita que dos usuarios lo reserven a la vez
      const { count } = await tx.turno.updateMany({
        where: { id: turnoId, estado: 'DISPONIBLE' },
        data: { estado: 'RESERVADO' },
      });
      if (count === 0) throw new BadRequestException('El turno no está disponible');

      // turnoId es único en Reserva: si hubo una reserva cancelada se reutiliza
      return tx.reserva.upsert({
        where: { turnoId },
        create: { turnoId, usuarioId },
        update: { usuarioId, estado: 'CONFIRMADA', creadoEn: new Date() },
        include: { turno: { include: { cancha: { include: { complejo: true } } } } },
      });
    });
  }

  async cancelar(id: string, usuarioId: string) {
    const reserva = await this.prisma.reserva.findFirst({
      where: { id, usuarioId },
    });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');
    if (reserva.estado === 'CANCELADA') throw new BadRequestException('La reserva ya está cancelada');

    const partidosActivos = await this.prisma.partido.findMany({
      where: { turnoId: reserva.turnoId, estado: { in: ['ABIERTO', 'COMPLETO'] } },
      select: { id: true },
    });

    const [reservaActualizada] = await this.prisma.$transaction([
      this.prisma.reserva.update({
        where: { id },
        data: { estado: 'CANCELADA' },
      }),
      this.prisma.turno.update({
        where: { id: reserva.turnoId },
        data: { estado: 'DISPONIBLE' },
      }),
      // Sin cancha no hay partido
      this.prisma.partido.updateMany({
        where: { turnoId: reserva.turnoId, estado: { in: ['ABIERTO', 'COMPLETO'] } },
        data: { estado: 'CANCELADO' },
      }),
    ]);

    await this.notificaciones.partidosCancelados(
      partidosActivos.map((p) => p.id),
      'el organizador canceló la reserva de la cancha',
    );
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
        usuario: { select: usuarioContactoSelect },
        pagos: true,
      },
      orderBy: { creadoEn: 'desc' },
    });
  }
}