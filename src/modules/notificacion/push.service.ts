import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { App, cert, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

// Errores de FCM que indican que el destino ya no sirve y hay que borrarlo
const DESTINOS_INVALIDOS = [
  'messaging/installation-id-not-registered',
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
];

// Envío de notificaciones push con Firebase Cloud Messaging.
// Queda apagado si no está FIREBASE_SERVICE_ACCOUNT (ruta al JSON de la cuenta de servicio).
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private app: App | null | undefined;

  private firebase(): App | null {
    if (this.app !== undefined) return this.app;
    const ruta = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!ruta) {
      this.logger.log('Push desactivado: falta FIREBASE_SERVICE_ACCOUNT en el .env');
      this.app = null;
      return null;
    }
    try {
      this.app = initializeApp({ credential: cert(JSON.parse(readFileSync(ruta, 'utf8'))) }, 'padelbook');
      this.logger.log('Push activado con Firebase Cloud Messaging');
    } catch (e) {
      this.logger.error(`No se pudo iniciar Firebase con ${ruta}: ${(e as Error).message}`);
      this.app = null;
    }
    return this.app;
  }

  // Los destinos son Firebase Installation IDs (FID) que registra la app.
  // Devuelve los que FCM rechazó como inválidos, para borrarlos.
  async enviar(fids: string[], mensaje: { titulo: string; cuerpo: string; data: Record<string, string> }) {
    const app = this.firebase();
    if (!app || fids.length === 0) return [];

    const respuesta = await getMessaging(app).sendEachForMulticast({
      fids,
      notification: { title: mensaje.titulo, body: mensaje.cuerpo },
      data: mensaje.data,
      android: { priority: 'high', notification: { channelId: 'padel_avisos' } },
    });
    return respuesta.responses
      .map((r, i) => (r.error && DESTINOS_INVALIDOS.includes(r.error.code) ? fids[i] : null))
      .filter((f): f is string => f !== null);
  }
}
