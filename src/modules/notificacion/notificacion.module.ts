import { Global, Module } from '@nestjs/common';
import { NotificacionService } from './notificacion.service';
import { NotificacionController } from './notificacion.controller';
import { PushService } from './push.service';

// Global: partidos, torneos, clases y reservas generan notificaciones
@Global()
@Module({
  providers: [NotificacionService, PushService],
  controllers: [NotificacionController],
  exports: [NotificacionService],
})
export class NotificacionModule {}
