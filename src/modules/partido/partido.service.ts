import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Categoria, Rama, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { usuarioPublicoSelect } from '../../common/selects';
import { validarEnum, validarEnteroPositivo, validarFecha } from '../../common/validacion';

const partidoInclude = {
  turno: { include: { cancha: { include: { complejo: true } } } },
  creador: { select: usuarioPublicoSelect },
  jugadores: {
    where: { estado: { in: ['PENDIENTE', 'ACEPTADA'] } },
    include: { usuario: { select: usuarioPublicoSelect } },
  },
} satisfies Prisma.PartidoInclude;

@Injectable()
export class PartidoService {
  constructor(private prisma: PrismaService) {}

  async listarAbiertos(filtros: {
    categoria?: string;
    rama?: string;
    complejoId?: string;
    desde?: string;
    hasta?: string;
  }) {
    const desde = filtros.desde ? validarFecha(filtros.desde, 'desde') : new Date();
    return this.prisma.partido.findMany({
      where: {
        estado: 'ABIERTO',
        categoria: filtros.categoria ? validarEnum(Categoria, filtros.categoria, 'categoria') : undefined,
        rama: filtros.rama ? validarEnum(Rama, filtros.rama, 'rama') : undefined,
        turno: {
          fechaHoraInicio: {
            gte: desde,
            lte: filtros.hasta ? validarFecha(filtros.hasta, 'hasta') : undefined,
          },
          cancha: filtros.complejoId ? { complejoId: filtros.complejoId } : undefined,
        },
      },
      include: partidoInclude,
      orderBy: { turno: { fechaHoraInicio: 'asc' } },
    });
  }

  async findById(id: string) {
    const partido = await this.prisma.partido.findUnique({
      where: { id },
      include: partidoInclude,
    });
    if (!partido) throw new NotFoundException('Partido no encontrado');
    return partido;
  }

  async misPartidos(usuarioId: string) {
    return this.prisma.partido.findMany({
      where: {
        OR: [
          { creadorId: usuarioId },
          { jugadores: { some: { usuarioId, estado: { in: ['PENDIENTE', 'ACEPTADA'] } } } },
        ],
      },
      include: partidoInclude,
      orderBy: { turno: { fechaHoraInicio: 'desc' } },
    });
  }

  async crear(creadorId: string, data: {
    turnoId: string;
    categoria: string;
    rama: string;
    jugadoresBuscados: number;
    descripcion?: string;
  }) {
    const jugadoresBuscados = validarEnteroPositivo(data.jugadoresBuscados, 'jugadoresBuscados');
    if (jugadoresBuscados > 3) throw new BadRequestException('Se pueden buscar como máximo 3 jugadores');

    // El creador tiene que tener la cancha: una reserva confirmada de ese turno a su nombre
    const reserva = await this.prisma.reserva.findUnique({
      where: { turnoId: data.turnoId },
      include: { turno: true },
    });
    if (!reserva || reserva.usuarioId !== creadorId || reserva.estado !== 'CONFIRMADA') {
      throw new BadRequestException('Para armar un partido necesitás tener reservado ese turno');
    }
    if (reserva.turno.fechaHoraInicio <= new Date()) {
      throw new BadRequestException('El turno ya pasó');
    }

    const activo = await this.prisma.partido.findFirst({
      where: { turnoId: data.turnoId, estado: { in: ['ABIERTO', 'COMPLETO'] } },
    });
    if (activo) throw new BadRequestException('Ya hay un partido publicado para ese turno');

    return this.prisma.partido.create({
      data: {
        turnoId: data.turnoId,
        creadorId,
        categoria: validarEnum(Categoria, data.categoria, 'categoria'),
        rama: validarEnum(Rama, data.rama, 'rama'),
        jugadoresBuscados,
        descripcion: data.descripcion,
      },
      include: partidoInclude,
    });
  }

  async solicitarUnirse(partidoId: string, usuarioId: string) {
    const partido = await this.prisma.partido.findUnique({
      where: { id: partidoId },
      include: { turno: true },
    });
    if (!partido) throw new NotFoundException('Partido no encontrado');
    if (partido.estado !== 'ABIERTO') throw new BadRequestException('El partido no está abierto');
    if (partido.turno.fechaHoraInicio <= new Date()) throw new BadRequestException('El partido ya pasó');
    if (partido.creadorId === usuarioId) throw new BadRequestException('Sos el creador del partido');

    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario?.categoria || !usuario.genero) {
      throw new BadRequestException('Completá tu categoría y género en el perfil para sumarte a partidos');
    }
    if (partido.rama !== 'MIXTO' && partido.rama !== usuario.genero) {
      throw new BadRequestException(`El partido es de rama ${partido.rama.toLowerCase()}`);
    }

    const existente = await this.prisma.partidoJugador.findUnique({
      where: { partidoId_usuarioId: { partidoId, usuarioId } },
    });
    if (existente) {
      if (existente.estado === 'RECHAZADA') throw new BadRequestException('Tu solicitud fue rechazada');
      if (existente.estado !== 'CANCELADA') throw new BadRequestException('Ya tenés una solicitud en este partido');
      return this.prisma.partidoJugador.update({
        where: { id: existente.id },
        data: { estado: 'PENDIENTE', creadoEn: new Date() },
      });
    }

    return this.prisma.partidoJugador.create({
      data: { partidoId, usuarioId },
    });
  }

  async responderSolicitud(partidoId: string, solicitudId: string, creadorId: string, estado: string) {
    if (estado !== 'ACEPTADA' && estado !== 'RECHAZADA') {
      throw new BadRequestException('estado debe ser ACEPTADA o RECHAZADA');
    }

    return this.prisma.$transaction(async (tx) => {
      const partido = await tx.partido.findUnique({ where: { id: partidoId } });
      if (!partido) throw new NotFoundException('Partido no encontrado');
      if (partido.creadorId !== creadorId) throw new ForbiddenException('Solo el creador puede responder solicitudes');
      if (partido.estado !== 'ABIERTO') throw new BadRequestException('El partido no está abierto');

      const solicitud = await tx.partidoJugador.findFirst({
        where: { id: solicitudId, partidoId, estado: 'PENDIENTE' },
      });
      if (!solicitud) throw new NotFoundException('Solicitud pendiente no encontrada');

      if (estado === 'ACEPTADA') {
        const aceptados = await tx.partidoJugador.count({ where: { partidoId, estado: 'ACEPTADA' } });
        if (aceptados >= partido.jugadoresBuscados) throw new BadRequestException('El partido ya está completo');
        if (aceptados + 1 === partido.jugadoresBuscados) {
          await tx.partido.update({ where: { id: partidoId }, data: { estado: 'COMPLETO' } });
        }
      }

      return tx.partidoJugador.update({
        where: { id: solicitudId },
        data: { estado },
      });
    });
  }

  async salir(partidoId: string, usuarioId: string) {
    return this.prisma.$transaction(async (tx) => {
      const solicitud = await tx.partidoJugador.findUnique({
        where: { partidoId_usuarioId: { partidoId, usuarioId } },
        include: { partido: true },
      });
      if (!solicitud || (solicitud.estado !== 'PENDIENTE' && solicitud.estado !== 'ACEPTADA')) {
        throw new NotFoundException('No estás anotado en este partido');
      }

      // Si se baja un jugador aceptado, el partido vuelve a buscar
      if (solicitud.estado === 'ACEPTADA' && solicitud.partido.estado === 'COMPLETO') {
        await tx.partido.update({ where: { id: partidoId }, data: { estado: 'ABIERTO' } });
      }

      return tx.partidoJugador.update({
        where: { id: solicitud.id },
        data: { estado: 'CANCELADA' },
      });
    });
  }

  async cancelar(partidoId: string, creadorId: string) {
    const partido = await this.prisma.partido.findUnique({ where: { id: partidoId } });
    if (!partido) throw new NotFoundException('Partido no encontrado');
    if (partido.creadorId !== creadorId) throw new ForbiddenException('Solo el creador puede cancelar el partido');
    if (partido.estado === 'CANCELADO') throw new BadRequestException('El partido ya está cancelado');

    return this.prisma.partido.update({
      where: { id: partidoId },
      data: { estado: 'CANCELADO' },
    });
  }
}
