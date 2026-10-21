import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Categoria } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { verificarCanchaLibre } from '../../common/agenda';
import { complejoVisible, usuarioContactoSelect } from '../../common/selects';
import { validarEnum, validarEnteroPositivo, validarFecha } from '../../common/validacion';
import { NotificacionService, fechaCorta } from '../notificacion/notificacion.service';

const conteoConfirmadas = {
  _count: { select: { inscripciones: { where: { estado: 'CONFIRMADA' as const } } } },
};

// Clases donde todavía tiene sentido confirmar o rechazar inscripciones
export const claseActiva = () => ({ estado: 'PUBLICADA' as const, fechaHoraInicio: { gte: new Date() } });

@Injectable()
export class ClaseService {
  constructor(
    private prisma: PrismaService,
    private notificaciones: NotificacionService,
  ) {}

  // --- Admin ---

  async findByComplejo(complejoId: string) {
    const [clases, pendientes] = await Promise.all([
      this.prisma.clase.findMany({
        where: { complejoId },
        include: { cancha: true, ...conteoConfirmadas },
        orderBy: { fechaHoraInicio: 'desc' },
      }),
      this.prisma.inscripcionClase.groupBy({
        by: ['claseId'],
        where: { estado: 'PENDIENTE', clase: { complejoId, ...claseActiva() } },
        _count: true,
      }),
    ]);
    // Inscripciones que esperan que el admin las confirme o rechace
    const porClase = new Map(pendientes.map((p) => [p.claseId, p._count]));
    return clases.map((c) => ({ ...c, pendientes: porClase.get(c.id) ?? 0 }));
  }

  async crear(complejoId: string, data: {
    canchaId: string;
    profesor: string;
    nivel?: string;
    descripcion?: string;
    fechaHoraInicio: string;
    fechaHoraFin: string;
    cupo: number;
    precio: number;
  }) {
    if (!data.profesor) throw new BadRequestException('profesor es obligatorio');
    if (typeof data.precio !== 'number' || data.precio < 0) throw new BadRequestException('precio debe ser un número >= 0');

    const cancha = await this.prisma.cancha.findFirst({
      where: { id: data.canchaId, complejoId, activa: true },
    });
    if (!cancha) throw new NotFoundException('Cancha no encontrada');

    const inicio = validarFecha(data.fechaHoraInicio, 'fechaHoraInicio');
    const fin = validarFecha(data.fechaHoraFin, 'fechaHoraFin');
    await verificarCanchaLibre(this.prisma, data.canchaId, inicio, fin);

    return this.prisma.clase.create({
      data: {
        complejoId,
        canchaId: data.canchaId,
        profesor: data.profesor,
        nivel: data.nivel ? validarEnum(Categoria, data.nivel, 'nivel') : undefined,
        descripcion: data.descripcion,
        fechaHoraInicio: inicio,
        fechaHoraFin: fin,
        cupo: validarEnteroPositivo(data.cupo, 'cupo'),
        precio: data.precio,
      },
      include: { cancha: true },
    });
  }

  async cancelar(id: string, complejoId: string) {
    const clase = await this.prisma.clase.findFirst({ where: { id, complejoId } });
    if (!clase) throw new NotFoundException('Clase no encontrada');
    if (clase.estado === 'CANCELADA') throw new BadRequestException('La clase ya está cancelada');

    const inscriptos = await this.prisma.inscripcionClase.findMany({
      where: { claseId: id, estado: { in: ['PENDIENTE', 'CONFIRMADA'] } },
      include: { clase: { include: { complejo: true } } },
    });

    const [claseCancelada] = await this.prisma.$transaction([
      this.prisma.clase.update({ where: { id }, data: { estado: 'CANCELADA' } }),
      this.prisma.inscripcionClase.updateMany({
        where: { claseId: id, estado: { in: ['PENDIENTE', 'CONFIRMADA'] } },
        data: { estado: 'CANCELADA' },
      }),
    ]);

    await this.notificaciones.notificar(inscriptos.map((i) => i.usuarioId), {
      tipo: 'CLASE_CANCELADA',
      titulo: 'Se canceló una clase',
      cuerpo: `${clase.profesor} no va a dar la clase del ${fechaCorta(clase.fechaHoraInicio)}${inscriptos[0] ? ` en ${inscriptos[0].clase.complejo.nombre}` : ''}`,
      refId: id,
    });
    return claseCancelada;
  }

  async inscripcionesDeLaClase(claseId: string, complejoId: string) {
    const clase = await this.prisma.clase.findFirst({ where: { id: claseId, complejoId } });
    if (!clase) throw new NotFoundException('Clase no encontrada');

    return this.prisma.inscripcionClase.findMany({
      where: { claseId },
      include: { usuario: { select: usuarioContactoSelect }, pagos: true },
      orderBy: { creadoEn: 'asc' },
    });
  }

  async responderInscripcion(inscripcionId: string, complejoId: string, estado: string) {
    if (estado !== 'CONFIRMADA' && estado !== 'RECHAZADA') {
      throw new BadRequestException('estado debe ser CONFIRMADA o RECHAZADA');
    }

    const actualizada = await this.prisma.$transaction(async (tx) => {
      const inscripcion = await tx.inscripcionClase.findFirst({
        where: { id: inscripcionId, clase: { complejoId } },
        include: { clase: true },
      });
      if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');
      if (inscripcion.estado !== 'PENDIENTE') throw new BadRequestException('La inscripción no está pendiente');

      if (estado === 'CONFIRMADA') {
        const confirmadas = await tx.inscripcionClase.count({
          where: { claseId: inscripcion.claseId, estado: 'CONFIRMADA' },
        });
        if (confirmadas >= inscripcion.clase.cupo) throw new BadRequestException('La clase está completa');
      }

      return tx.inscripcionClase.update({
        where: { id: inscripcionId },
        data: { estado },
        include: { clase: { include: { complejo: true } } },
      });
    });

    const { clase } = actualizada;
    const cuando = `${fechaCorta(clase.fechaHoraInicio)} en ${clase.complejo.nombre}`;
    await this.notificaciones.notificar([actualizada.usuarioId], estado === 'CONFIRMADA'
      ? { tipo: 'INSCRIPCION_CLASE_CONFIRMADA', titulo: '¡Clase confirmada!', cuerpo: `Te esperamos el ${cuando} con ${clase.profesor}`, refId: clase.id }
      : { tipo: 'INSCRIPCION_CLASE_RECHAZADA', titulo: 'Inscripción a clase rechazada', cuerpo: `No quedó tu lugar en la clase del ${cuando}`, refId: clase.id });
    return actualizada;
  }

  // --- Usuario ---

  async listarPublicadas(filtros: { complejoId?: string; nivel?: string }) {
    return this.prisma.clase.findMany({
      where: {
        estado: 'PUBLICADA',
        fechaHoraInicio: { gte: new Date() },
        complejoId: filtros.complejoId,
        complejo: complejoVisible,
        nivel: filtros.nivel ? validarEnum(Categoria, filtros.nivel, 'nivel') : undefined,
      },
      include: { cancha: true, complejo: true, ...conteoConfirmadas },
      orderBy: { fechaHoraInicio: 'asc' },
    });
  }

  async misInscripciones(usuarioId: string) {
    return this.prisma.inscripcionClase.findMany({
      where: { usuarioId },
      include: { clase: { include: { cancha: true, complejo: true } } },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async inscribirse(claseId: string, usuarioId: string) {
    const clase = await this.prisma.clase.findFirst({ where: { id: claseId, complejo: complejoVisible } });
    if (!clase) throw new NotFoundException('Clase no encontrada');
    if (clase.estado !== 'PUBLICADA' || clase.fechaHoraInicio <= new Date()) {
      throw new BadRequestException('La clase no admite inscripciones');
    }

    const confirmadas = await this.prisma.inscripcionClase.count({
      where: { claseId, estado: 'CONFIRMADA' },
    });
    if (confirmadas >= clase.cupo) throw new BadRequestException('La clase está completa');

    const existente = await this.prisma.inscripcionClase.findUnique({
      where: { claseId_usuarioId: { claseId, usuarioId } },
    });
    if (existente) {
      if (existente.estado !== 'CANCELADA') throw new BadRequestException('Ya tenés una inscripción en esta clase');
      return this.prisma.inscripcionClase.update({
        where: { id: existente.id },
        data: { estado: 'PENDIENTE', creadoEn: new Date() },
      });
    }

    return this.prisma.inscripcionClase.create({
      data: { claseId, usuarioId },
    });
  }

  async cancelarInscripcion(inscripcionId: string, usuarioId: string) {
    const inscripcion = await this.prisma.inscripcionClase.findFirst({
      where: { id: inscripcionId, usuarioId },
    });
    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');
    if (inscripcion.estado !== 'PENDIENTE' && inscripcion.estado !== 'CONFIRMADA') {
      throw new BadRequestException('La inscripción no está activa');
    }

    return this.prisma.inscripcionClase.update({
      where: { id: inscripcionId },
      data: { estado: 'CANCELADA' },
    });
  }
}
