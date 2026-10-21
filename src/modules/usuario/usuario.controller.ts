import { Controller, Get, Patch, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { NovedadesService } from './novedades.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('usuario')
export class UsuarioController {
  constructor(
    private usuarioService: UsuarioService,
    private novedadesService: NovedadesService,
  ) {}

  @Get('me')
  getPerfil(@Request() req: any) {
    return this.usuarioService.getPerfil(req.user.id);
  }

  @Patch('me')
  updatePerfil(@Request() req: any, @Body() body: {
    nombre?: string;
    apellido?: string;
    telefono?: string;
    categoria?: string;
    genero?: string;
  }) {
    return this.usuarioService.updatePerfil(req.user.id, body);
  }

  @Get('me/novedades')
  novedades(@Request() req: any) {
    return this.novedadesService.paraUsuario(req.user.id);
  }

  @Get('me/favoritos')
  favoritos(@Request() req: any) {
    return this.usuarioService.favoritos(req.user.id);
  }

  @Post('me/favoritos/:complejoId')
  agregarFavorito(@Request() req: any, @Param('complejoId') complejoId: string) {
    return this.usuarioService.agregarFavorito(req.user.id, complejoId);
  }

  @Delete('me/favoritos/:complejoId')
  quitarFavorito(@Request() req: any, @Param('complejoId') complejoId: string) {
    return this.usuarioService.quitarFavorito(req.user.id, complejoId);
  }
}
