import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('usuario')
export class UsuarioController {
  constructor(private usuarioService: UsuarioService) {}

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
}
