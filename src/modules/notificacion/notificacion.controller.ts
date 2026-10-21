import { Controller, Get, Patch, Post, Body, UseGuards, Request } from '@nestjs/common';
import { NotificacionService } from './notificacion.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('usuarios/me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('usuario')
export class NotificacionController {
  constructor(private notificacionService: NotificacionService) {}

  @Get('notificaciones')
  listar(@Request() req: any) {
    return this.notificacionService.listar(req.user.id);
  }

  @Patch('notificaciones/leidas')
  marcarLeidas(@Request() req: any) {
    return this.notificacionService.marcarLeidas(req.user.id);
  }

  @Post('dispositivos')
  registrarDispositivo(@Request() req: any, @Body() body: { token: string; plataforma?: string }) {
    return this.notificacionService.registrarDispositivo(req.user.id, body.token, body.plataforma ?? 'android');
  }

  // El token de FCM puede tener ':' y otros caracteres: va en el body y no en la ruta
  @Post('dispositivos/baja')
  quitarDispositivo(@Request() req: any, @Body() body: { token: string }) {
    return this.notificacionService.quitarDispositivo(req.user.id, body.token);
  }
}
