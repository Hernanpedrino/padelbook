import { Injectable } from '@nestjs/common';
import { Categoria } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { complejoVisible } from '../../common/selects';

export type TipoNovedad =
  | 'SOLICITUDES_PARTIDO'
  | 'PARTIDO_CONFIRMADO'
  | 'RESERVA_PROXIMA'
  | 'INSCRIPCION_TORNEO'
  | 'INSCRIPCION_CLASE'
  | 'TORNEO_ABIERTO';

export interface Novedad {
  tipo: TipoNovedad;
  titulo: string;
  detalle: string;
  // Fecha del evento (partido, reserva, torneo); la app la formatea en la zona del celular
  fecha: Date;
  // Id del partido, reserva, torneo o clase al que lleva la novedad
  refId: string;
}

const ordenCategorias = Object.values(Categoria);
const DIAS_RESERVA_PROXIMA = 7;
const MAX_TORNEOS_SUGERIDOS = 5;

// Feed de la pantalla de inicio de la app, calculado a partir de los datos actuales
@Injectable()
export class NovedadesService {
  constructor(private prisma: PrismaService) {}

  async paraUsuario(usuarioId: string): Promise<Novedad[]> {
    const ahora = new Date();
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { favoritos: true },
    });
    if (!usuario) return [];

    const [solicitudes, confirmados, reservas, torneos, clases, sugeridos] = await Promise.all([
      this.solicitudesPendientes(usuarioId, ahora),
      this.partidosConfirmados(usuarioId, ahora),
      this.reservasProximas(usuarioId, ahora),
      this.inscripcionesTorneo(usuarioId, ahora),
      this.inscripcionesClase(usuarioId, ahora),
      this.torneosSugeridos(usuario, usuario.favoritos.map((f) => f.complejoId), ahora),
    ]);

    // Primero lo que requiere acción del jugador, después lo informativo
    return [...solicitudes, ...confirmados, ...reservas, ...torneos, ...clases, ...sugeridos];
  }

  private async solicitudesPendientes(usuarioId: string, ahora: Date): Promise<Novedad[]> {
    const partidos = await this.prisma.partido.findMany({
      where: {
        creadorId: usuarioId,
        estado: 'ABIERTO',
        turno: { fechaHoraInicio: { gte: ahora } },
        jugadores: { some: { estado: 'PENDIENTE' } },
      },
      include: {
        turno: { include: { cancha: { include: { complejo: true } } } },
        _count: { select: { jugadores: { where: { estado: 'PENDIENTE' } } } },
      },
      orderBy: { turno: { fechaHoraInicio: 'asc' } },
    });
    return partidos.map((p) => ({
      tipo: 'SOLICITUDES_PARTIDO' as const,
      titulo: p._count.jugadores === 1 ? 'Un jugador quiere sumarse a tu partido' : `${p._count.jugadores} jugadores quieren sumarse a tu partido`,
      detalle: p.turno.cancha.complejo.nombre,
      fecha: p.turno.fechaHoraInicio,
      refId: p.id,
    }));
  }

  private async partidosConfirmados(usuarioId: string, ahora: Date): Promise<Novedad[]> {
    const solicitudes = await this.prisma.partidoJugador.findMany({
      where: {
        usuarioId,
        estado: 'ACEPTADA',
        partido: { estado: { in: ['ABIERTO', 'COMPLETO'] }, turno: { fechaHoraInicio: { gte: ahora } } },
      },
      include: { partido: { include: { turno: { include: { cancha: { include: { complejo: true } } } } } } },
    });
    return solicitudes.map((s) => ({
      tipo: 'PARTIDO_CONFIRMADO' as const,
      titulo: 'Estás confirmado en un partido',
      detalle: s.partido.turno.cancha.complejo.nombre,
      fecha: s.partido.turno.fechaHoraInicio,
      refId: s.partidoId,
    }));
  }

  private async reservasProximas(usuarioId: string, ahora: Date): Promise<Novedad[]> {
    const limite = new Date(ahora.getTime() + DIAS_RESERVA_PROXIMA * 24 * 60 * 60 * 1000);
    const reservas = await this.prisma.reserva.findMany({
      where: { usuarioId, estado: 'CONFIRMADA', turno: { fechaHoraInicio: { gte: ahora, lte: limite } } },
      include: { turno: { include: { cancha: { include: { complejo: true } } } } },
      orderBy: { turno: { fechaHoraInicio: 'asc' } },
    });
    return reservas.map((r) => ({
      tipo: 'RESERVA_PROXIMA' as const,
      titulo: `Tenés reservada la ${r.turno.cancha.nombre}`,
      detalle: r.turno.cancha.complejo.nombre,
      fecha: r.turno.fechaHoraInicio,
      refId: r.id,
    }));
  }

  private async inscripcionesTorneo(usuarioId: string, ahora: Date): Promise<Novedad[]> {
    const inscripciones = await this.prisma.inscripcionTorneo.findMany({
      where: {
        OR: [{ jugador1Id: usuarioId }, { jugador2Id: usuarioId }],
        estado: { in: ['PENDIENTE', 'CONFIRMADA', 'RECHAZADA'] },
        torneo: { fechaFin: { gte: ahora }, estado: { not: 'CANCELADO' } },
      },
      include: { torneo: { include: { complejo: true } } },
    });
    const titulos = {
      PENDIENTE: 'Inscripción pendiente de confirmación',
      CONFIRMADA: 'Inscripción confirmada',
      RECHAZADA: 'Inscripción rechazada',
    } as const;
    return inscripciones.map((i) => ({
      tipo: 'INSCRIPCION_TORNEO' as const,
      titulo: `${titulos[i.estado as keyof typeof titulos]}: ${i.torneo.nombre}`,
      detalle: i.torneo.complejo.nombre,
      fecha: i.torneo.fechaInicio,
      refId: i.torneoId,
    }));
  }

  private async inscripcionesClase(usuarioId: string, ahora: Date): Promise<Novedad[]> {
    const inscripciones = await this.prisma.inscripcionClase.findMany({
      where: {
        usuarioId,
        estado: { in: ['PENDIENTE', 'CONFIRMADA', 'RECHAZADA'] },
        clase: { fechaHoraInicio: { gte: ahora }, estado: 'PUBLICADA' },
      },
      include: { clase: { include: { complejo: true } } },
    });
    const titulos = {
      PENDIENTE: 'Clase pendiente de confirmación',
      CONFIRMADA: 'Clase confirmada',
      RECHAZADA: 'Inscripción a clase rechazada',
    } as const;
    return inscripciones.map((i) => ({
      tipo: 'INSCRIPCION_CLASE' as const,
      titulo: `${titulos[i.estado as keyof typeof titulos]} con ${i.clase.profesor}`,
      detalle: i.clase.complejo.nombre,
      fecha: i.clase.fechaHoraInicio,
      refId: i.claseId,
    }));
  }

  // Torneos con inscripción abierta en los que el jugador puede anotarse; primero los de sus favoritos
  private async torneosSugeridos(
    usuario: { id: string; categoria: Categoria | null; genero: string | null },
    favoritos: string[],
    ahora: Date,
  ): Promise<Novedad[]> {
    const torneos = await this.prisma.torneo.findMany({
      where: {
        estado: 'PUBLICADO',
        cierreInscripcion: { gte: ahora },
        complejo: complejoVisible,
        inscripciones: {
          none: {
            estado: { in: ['PENDIENTE', 'CONFIRMADA'] },
            OR: [{ jugador1Id: usuario.id }, { jugador2Id: usuario.id }],
          },
        },
      },
      include: { complejo: true },
      orderBy: { fechaInicio: 'asc' },
    });

    const puedeJugar = (t: { categoria: Categoria; rama: string }) => {
      if (usuario.genero && t.rama !== 'MIXTO' && t.rama !== usuario.genero) return false;
      // Puede jugar su categoría o una superior, nunca una inferior
      if (usuario.categoria && ordenCategorias.indexOf(usuario.categoria) < ordenCategorias.indexOf(t.categoria)) return false;
      return true;
    };

    return torneos
      .filter(puedeJugar)
      .sort((a, b) => Number(favoritos.includes(b.complejoId)) - Number(favoritos.includes(a.complejoId)))
      .slice(0, MAX_TORNEOS_SUGERIDOS)
      .map((t) => ({
        tipo: 'TORNEO_ABIERTO' as const,
        titulo: `Inscripción abierta: ${t.nombre}`,
        detalle: t.complejo.nombre,
        fecha: t.fechaInicio,
        refId: t.id,
      }));
  }
}
