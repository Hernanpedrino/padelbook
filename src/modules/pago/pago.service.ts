import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EstadoPago, MetodoPago } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { usuarioContactoSelect } from '../../common/selects';
import { validarEnum } from '../../common/validacion';

// Módulo opcional: el admin registra pagos (efectivo, transferencia, etc.) y aprueba o rechaza.
// Confirmar la inscripción sigue siendo una acción aparte del admin.
@Injectable()
export class PagoService {
  constructor(private prisma: PrismaService) {}

  async listar(complejoId: string, estado?: string) {
    await this.verificarHabilitado(complejoId);
    return this.prisma.pago.findMany({
      where: {
        complejoId,
        estado: estado ? validarEnum(EstadoPago, estado, 'estado') : undefined,
      },
      include: {
        reserva: { include: { usuario: { select: usuarioContactoSelect }, turno: { include: { cancha: true } } } },
        inscripcionTorneo: {
          include: {
            torneo: true,
            jugador1: { select: usuarioContactoSelect },
            jugador2: { select: usuarioContactoSelect },
          },
        },
        inscripcionClase: { include: { clase: true, usuario: { select: usuarioContactoSelect } } },
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async registrar(complejoId: string, data: {
    reservaId?: string;
    inscripcionTorneoId?: string;
    inscripcionClaseId?: string;
    monto: number;
    metodo: string;
    estado?: string;
    referencia?: string;
  }) {
    await this.verificarHabilitado(complejoId);

    const destinos = [data.reservaId, data.inscripcionTorneoId, data.inscripcionClaseId].filter(Boolean);
    if (destinos.length !== 1) {
      throw new BadRequestException('Indicá una sola de: reservaId, inscripcionTorneoId o inscripcionClaseId');
    }
    if (typeof data.monto !== 'number' || data.monto <= 0) throw new BadRequestException('monto debe ser mayor a 0');

    const pertenece =
      (data.reservaId &&
        (await this.prisma.reserva.findFirst({ where: { id: data.reservaId, turno: { cancha: { complejoId } } } }))) ||
      (data.inscripcionTorneoId &&
        (await this.prisma.inscripcionTorneo.findFirst({ where: { id: data.inscripcionTorneoId, torneo: { complejoId } } }))) ||
      (data.inscripcionClaseId &&
        (await this.prisma.inscripcionClase.findFirst({ where: { id: data.inscripcionClaseId, clase: { complejoId } } })));
    if (!pertenece) throw new NotFoundException('No se encontró lo que se quiere cobrar en tu complejo');

    return this.prisma.pago.create({
      data: {
        complejoId,
        reservaId: data.reservaId,
        inscripcionTorneoId: data.inscripcionTorneoId,
        inscripcionClaseId: data.inscripcionClaseId,
        monto: data.monto,
        metodo: validarEnum(MetodoPago, data.metodo, 'metodo'),
        estado: data.estado ? validarEnum(EstadoPago, data.estado, 'estado') : 'APROBADO',
        referencia: data.referencia,
      },
    });
  }

  async actualizarEstado(id: string, complejoId: string, estado: string) {
    await this.verificarHabilitado(complejoId);
    const pago = await this.prisma.pago.findFirst({ where: { id, complejoId } });
    if (!pago) throw new NotFoundException('Pago no encontrado');

    return this.prisma.pago.update({
      where: { id },
      data: { estado: validarEnum(EstadoPago, estado, 'estado') },
    });
  }

  private async verificarHabilitado(complejoId: string) {
    const complejo = await this.prisma.complejo.findUnique({ where: { id: complejoId } });
    if (!complejo?.pagosHabilitados) {
      throw new ForbiddenException('El módulo de pagos no está habilitado para este complejo');
    }
  }
}
