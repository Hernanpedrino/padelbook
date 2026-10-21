import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from './push.service';

export type TipoNotificacion =
  | 'SOLICITUD_PARTIDO'
  | 'SOLICITUD_ACEPTADA'
  | 'SOLICITUD_RECHAZADA'
  | 'PARTIDO_COMPLETO'
  | 'JUGADOR_SE_BAJO'
  | 'PARTIDO_CANCELADO'
  | 'TURNO_CANCELADO'
  | 'INSCRIPTO_POR_COMPANERO'
  | 'INSCRIPCION_TORNEO_CONFIRMADA'
  | 'INSCRIPCION_TORNEO_RECHAZADA'
  | 'INSCRIPCION_CLASE_CONFIRMADA'
  | 'INSCRIPCION_CLASE_RECHAZADA'
  | 'CLASE_CANCELADA';

export interface NuevaNotificacion {
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  refId?: string;
}

const ZONA_HORARIA = process.env.APP_TIMEZONE ?? 'America/Argentina/Buenos_Aires';

// "sáb 25/10 20:00" en la hora de los complejos (el servidor puede estar en UTC).
// Se arma por partes porque el formato es-AR de Node da "25-10 08:00 p. m."
export function fechaCorta(fecha: Date) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('es-AR', {
      timeZone: ZONA_HORARIA,
      weekday: 'short',
      day: 'numeric',
      month: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(fecha)
      .map((p) => [p.type, p.value]),
  );
  return `${partes.weekday.replace('.', '')} ${partes.day}/${partes.month} ${partes.hour}:${partes.minute}`;
}

@Injectable()
export class NotificacionService {
  private readonly logger = new Logger(NotificacionService.name);

  constructor(
    private prisma: PrismaService,
    private push: PushService,
  ) {}

  // Guarda la notificación y la manda por push. Nunca lanza: un aviso que falla
  // no tiene que romper la operación que lo generó (confirmar, reservar, etc.)
  async notificar(usuarioIds: string[], n: NuevaNotificacion) {
    const destinatarios = [...new Set(usuarioIds)];
    if (destinatarios.length === 0) return;
    try {
      await this.prisma.notificacion.createMany({
        data: destinatarios.map((usuarioId) => ({ usuarioId, ...n })),
      });
      const dispositivos = await this.prisma.dispositivo.findMany({ where: { usuarioId: { in: destinatarios } } });
      const invalidos = await this.push.enviar(
        dispositivos.map((d) => d.token),
        { titulo: n.titulo, cuerpo: n.cuerpo, data: { tipo: n.tipo, refId: n.refId ?? '' } },
      );
      if (invalidos.length) await this.prisma.dispositivo.deleteMany({ where: { token: { in: invalidos } } });
    } catch (e) {
      this.logger.error(`No se pudo notificar ${n.tipo}: ${(e as Error).message}`);
    }
  }

  // "sáb 25/10 20:00 en Blindex Padel", para los textos de las notificaciones de partidos
  async descripcionPartido(partidoId: string) {
    const p = await this.prisma.partido.findUnique({
      where: { id: partidoId },
      include: { turno: { include: { cancha: { include: { complejo: true } } } } },
    });
    return p ? `${fechaCorta(p.turno.fechaHoraInicio)} en ${p.turno.cancha.complejo.nombre}` : '';
  }

  // Avisa a los anotados (pendientes y confirmados) que el partido se canceló
  async partidosCancelados(partidoIds: string[], motivo: string) {
    for (const partidoId of partidoIds) {
      const jugadores = await this.prisma.partidoJugador.findMany({
        where: { partidoId, estado: { in: ['PENDIENTE', 'ACEPTADA'] } },
      });
      await this.notificar(jugadores.map((j) => j.usuarioId), {
        tipo: 'PARTIDO_CANCELADO',
        titulo: 'Se canceló un partido',
        cuerpo: `El partido del ${await this.descripcionPartido(partidoId)} se canceló: ${motivo}`,
        refId: partidoId,
      });
    }
  }

  async listar(usuarioId: string) {
    const [items, noLeidas] = await Promise.all([
      this.prisma.notificacion.findMany({ where: { usuarioId }, orderBy: { creadoEn: 'desc' }, take: 50 }),
      this.prisma.notificacion.count({ where: { usuarioId, leida: false } }),
    ]);
    return { noLeidas, items };
  }

  async marcarLeidas(usuarioId: string) {
    await this.prisma.notificacion.updateMany({ where: { usuarioId, leida: false }, data: { leida: true } });
    return { noLeidas: 0 };
  }

  // Un mismo celular puede pasar de un usuario a otro: el token queda con el último que inició sesión
  async registrarDispositivo(usuarioId: string, token: string, plataforma: string) {
    if (!token) return { ok: false };
    await this.prisma.dispositivo.upsert({
      where: { token },
      update: { usuarioId, plataforma },
      create: { token, usuarioId, plataforma: plataforma || 'android' },
    });
    return { ok: true };
  }

  async quitarDispositivo(usuarioId: string, token: string) {
    await this.prisma.dispositivo.deleteMany({ where: { token, usuarioId } });
    return { ok: true };
  }
}
