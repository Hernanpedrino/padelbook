import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Categoria, EstadoTorneo, Rama, Usuario } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { complejoVisible, usuarioContactoSelect, usuarioPublicoSelect } from '../../common/selects';
import { validarEnum, validarEnteroPositivo, validarFecha } from '../../common/validacion';

// PRIMERA es la más alta; un jugador puede jugar su categoría o una superior, nunca una inferior
const ordenCategorias = Object.values(Categoria);

const conteoConfirmadas = {
  _count: { select: { inscripciones: { where: { estado: 'CONFIRMADA' as const } } } },
};

// Torneos donde todavía tiene sentido confirmar o rechazar inscripciones
export const torneoActivo = { estado: { notIn: ['CANCELADO' as const, 'FINALIZADO' as const] } };

type DatosTorneo = {
  nombre?: string;
  descripcion?: string;
  categoria?: string;
  rama?: string;
  fechaInicio?: string;
  fechaFin?: string;
  cierreInscripcion?: string;
  cupoParejas?: number;
  precioInscripcion?: number;
  estado?: string;
};

@Injectable()
export class TorneoService {
  constructor(private prisma: PrismaService) {}

  // --- Admin ---

  async findByComplejo(complejoId: string) {
    const [torneos, pendientes] = await Promise.all([
      this.prisma.torneo.findMany({
        where: { complejoId },
        include: conteoConfirmadas,
        orderBy: { fechaInicio: 'desc' },
      }),
      this.prisma.inscripcionTorneo.groupBy({
        by: ['torneoId'],
        where: { estado: 'PENDIENTE', torneo: { complejoId, ...torneoActivo } },
        _count: true,
      }),
    ]);
    // Inscripciones que esperan que el admin las confirme o rechace
    const porTorneo = new Map(pendientes.map((p) => [p.torneoId, p._count]));
    return torneos.map((t) => ({ ...t, pendientes: porTorneo.get(t.id) ?? 0 }));
  }

  async crear(complejoId: string, data: DatosTorneo) {
    if (!data.nombre) throw new BadRequestException('nombre es obligatorio');
    const fechas = this.validarFechas(
      validarFecha(data.fechaInicio, 'fechaInicio'),
      validarFecha(data.fechaFin, 'fechaFin'),
      validarFecha(data.cierreInscripcion, 'cierreInscripcion'),
    );

    return this.prisma.torneo.create({
      data: {
        complejoId,
        nombre: data.nombre,
        descripcion: data.descripcion,
        categoria: validarEnum(Categoria, data.categoria, 'categoria'),
        rama: validarEnum(Rama, data.rama, 'rama'),
        ...fechas,
        cupoParejas: validarEnteroPositivo(data.cupoParejas, 'cupoParejas'),
        precioInscripcion: this.validarPrecio(data.precioInscripcion),
        estado: data.estado ? validarEnum(EstadoTorneo, data.estado, 'estado') : undefined,
      },
    });
  }

  async actualizar(id: string, complejoId: string, data: DatosTorneo) {
    const torneo = await this.prisma.torneo.findFirst({ where: { id, complejoId } });
    if (!torneo) throw new NotFoundException('Torneo no encontrado');

    const fechas = this.validarFechas(
      data.fechaInicio !== undefined ? validarFecha(data.fechaInicio, 'fechaInicio') : torneo.fechaInicio,
      data.fechaFin !== undefined ? validarFecha(data.fechaFin, 'fechaFin') : torneo.fechaFin,
      data.cierreInscripcion !== undefined ? validarFecha(data.cierreInscripcion, 'cierreInscripcion') : torneo.cierreInscripcion,
    );

    return this.prisma.torneo.update({
      where: { id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        categoria: data.categoria !== undefined ? validarEnum(Categoria, data.categoria, 'categoria') : undefined,
        rama: data.rama !== undefined ? validarEnum(Rama, data.rama, 'rama') : undefined,
        ...fechas,
        cupoParejas: data.cupoParejas !== undefined ? validarEnteroPositivo(data.cupoParejas, 'cupoParejas') : undefined,
        precioInscripcion: data.precioInscripcion !== undefined ? this.validarPrecio(data.precioInscripcion) : undefined,
        estado: data.estado !== undefined ? validarEnum(EstadoTorneo, data.estado, 'estado') : undefined,
      },
    });
  }

  async inscripcionesDelTorneo(torneoId: string, complejoId: string) {
    const torneo = await this.prisma.torneo.findFirst({ where: { id: torneoId, complejoId } });
    if (!torneo) throw new NotFoundException('Torneo no encontrado');

    return this.prisma.inscripcionTorneo.findMany({
      where: { torneoId },
      include: {
        jugador1: { select: usuarioContactoSelect },
        jugador2: { select: usuarioContactoSelect },
        pagos: true,
      },
      orderBy: { creadoEn: 'asc' },
    });
  }

  async responderInscripcion(inscripcionId: string, complejoId: string, estado: string) {
    if (estado !== 'CONFIRMADA' && estado !== 'RECHAZADA') {
      throw new BadRequestException('estado debe ser CONFIRMADA o RECHAZADA');
    }

    return this.prisma.$transaction(async (tx) => {
      const inscripcion = await tx.inscripcionTorneo.findFirst({
        where: { id: inscripcionId, torneo: { complejoId } },
        include: { torneo: true },
      });
      if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');
      if (inscripcion.estado !== 'PENDIENTE') throw new BadRequestException('La inscripción no está pendiente');

      if (estado === 'CONFIRMADA') {
        const confirmadas = await tx.inscripcionTorneo.count({
          where: { torneoId: inscripcion.torneoId, estado: 'CONFIRMADA' },
        });
        if (confirmadas >= inscripcion.torneo.cupoParejas) throw new BadRequestException('El torneo está completo');
      }

      return tx.inscripcionTorneo.update({
        where: { id: inscripcionId },
        data: { estado },
      });
    });
  }

  // --- Usuario ---

  async listarPublicados(filtros: { categoria?: string; rama?: string; complejoId?: string }) {
    return this.prisma.torneo.findMany({
      where: {
        estado: 'PUBLICADO',
        cierreInscripcion: { gte: new Date() },
        categoria: filtros.categoria ? validarEnum(Categoria, filtros.categoria, 'categoria') : undefined,
        rama: filtros.rama ? validarEnum(Rama, filtros.rama, 'rama') : undefined,
        complejoId: filtros.complejoId,
        complejo: complejoVisible,
      },
      include: { complejo: true, ...conteoConfirmadas },
      orderBy: { fechaInicio: 'asc' },
    });
  }

  async misInscripciones(usuarioId: string) {
    return this.prisma.inscripcionTorneo.findMany({
      where: { OR: [{ jugador1Id: usuarioId }, { jugador2Id: usuarioId }] },
      include: {
        torneo: { include: { complejo: true } },
        jugador1: { select: usuarioPublicoSelect },
        jugador2: { select: usuarioPublicoSelect },
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async inscribirse(torneoId: string, usuarioId: string, companeroEmail: string) {
    const torneo = await this.prisma.torneo.findFirst({ where: { id: torneoId, complejo: complejoVisible } });
    if (!torneo) throw new NotFoundException('Torneo no encontrado');
    if (torneo.estado !== 'PUBLICADO' || torneo.cierreInscripcion < new Date()) {
      throw new BadRequestException('La inscripción al torneo está cerrada');
    }

    const jugador = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    const companero = companeroEmail
      ? await this.prisma.usuario.findUnique({ where: { email: companeroEmail } })
      : null;
    if (!jugador) throw new NotFoundException('Usuario no encontrado');
    if (!companero) throw new NotFoundException('No hay un jugador registrado con ese email');
    if (companero.id === usuarioId) throw new BadRequestException('Tu compañero tiene que ser otro jugador');

    this.validarPareja(torneo.categoria, torneo.rama, jugador, companero);

    const activa = await this.prisma.inscripcionTorneo.findFirst({
      where: {
        torneoId,
        estado: { in: ['PENDIENTE', 'CONFIRMADA'] },
        OR: [
          { jugador1Id: { in: [jugador.id, companero.id] } },
          { jugador2Id: { in: [jugador.id, companero.id] } },
        ],
      },
    });
    if (activa) throw new BadRequestException('Alguno de los dos ya está inscripto en este torneo');

    const confirmadas = await this.prisma.inscripcionTorneo.count({
      where: { torneoId, estado: 'CONFIRMADA' },
    });
    if (confirmadas >= torneo.cupoParejas) throw new BadRequestException('El torneo está completo');

    return this.prisma.inscripcionTorneo.create({
      data: { torneoId, jugador1Id: jugador.id, jugador2Id: companero.id },
      include: {
        torneo: true,
        jugador1: { select: usuarioPublicoSelect },
        jugador2: { select: usuarioPublicoSelect },
      },
    });
  }

  async cancelarInscripcion(inscripcionId: string, usuarioId: string) {
    const inscripcion = await this.prisma.inscripcionTorneo.findUnique({ where: { id: inscripcionId } });
    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');
    if (inscripcion.jugador1Id !== usuarioId && inscripcion.jugador2Id !== usuarioId) {
      throw new ForbiddenException('No sos parte de esta inscripción');
    }
    if (inscripcion.estado !== 'PENDIENTE' && inscripcion.estado !== 'CONFIRMADA') {
      throw new BadRequestException('La inscripción no está activa');
    }

    return this.prisma.inscripcionTorneo.update({
      where: { id: inscripcionId },
      data: { estado: 'CANCELADA' },
    });
  }

  private validarPareja(categoria: Categoria, rama: Rama, ...jugadores: Usuario[]) {
    for (const j of jugadores) {
      if (!j.categoria || !j.genero) {
        throw new BadRequestException(`${j.nombre} tiene que completar categoría y género en su perfil`);
      }
      // Índice menor = categoría más alta: un 4ta no puede jugar un torneo de 6ta
      if (ordenCategorias.indexOf(j.categoria) < ordenCategorias.indexOf(categoria)) {
        throw new BadRequestException(`${j.nombre} es de ${j.categoria.toLowerCase()} y no puede jugar una categoría inferior`);
      }
      if (rama !== 'MIXTO' && j.genero !== rama) {
        throw new BadRequestException(`El torneo es de rama ${rama.toLowerCase()}`);
      }
    }
    if (rama === 'MIXTO' && jugadores[0].genero === jugadores[1].genero) {
      throw new BadRequestException('En rama mixta la pareja tiene que ser un hombre y una mujer');
    }
  }

  private validarFechas(fechaInicio: Date, fechaFin: Date, cierreInscripcion: Date) {
    if (fechaFin < fechaInicio) throw new BadRequestException('fechaFin no puede ser anterior a fechaInicio');
    if (cierreInscripcion > fechaInicio) throw new BadRequestException('cierreInscripcion tiene que ser antes del inicio');
    return { fechaInicio, fechaFin, cierreInscripcion };
  }

  private validarPrecio(precio: unknown) {
    if (typeof precio !== 'number' || precio < 0) throw new BadRequestException('precioInscripcion debe ser un número >= 0');
    return precio;
  }
}
