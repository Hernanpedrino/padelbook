import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { TorneoService } from './torneo.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

type BodyTorneo = {
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

@Controller('torneos')
export class TorneoController {
  constructor(private torneoService: TorneoService) {}

  @Get()
  listarPublicados(
    @Query('categoria') categoria?: string,
    @Query('rama') rama?: string,
    @Query('complejoId') complejoId?: string,
  ) {
    return this.torneoService.listarPublicados({ categoria, rama, complejoId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('mi-complejo')
  findByComplejo(@Request() req: any) {
    return this.torneoService.findByComplejo(req.user.complejoId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('usuario')
  @Get('mis-inscripciones')
  misInscripciones(@Request() req: any) {
    return this.torneoService.misInscripciones(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  crear(@Request() req: any, @Body() body: BodyTorneo) {
    return this.torneoService.crear(req.user.complejoId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('inscripciones/:id')
  responderInscripcion(@Request() req: any, @Param('id') id: string, @Body() body: { estado: string }) {
    return this.torneoService.responderInscripcion(id, req.user.complejoId, body.estado);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('usuario')
  @Patch('inscripciones/:id/cancelar')
  cancelarInscripcion(@Request() req: any, @Param('id') id: string) {
    return this.torneoService.cancelarInscripcion(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id')
  actualizar(@Request() req: any, @Param('id') id: string, @Body() body: BodyTorneo) {
    return this.torneoService.actualizar(id, req.user.complejoId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get(':id/inscripciones')
  inscripciones(@Request() req: any, @Param('id') id: string) {
    return this.torneoService.inscripcionesDelTorneo(id, req.user.complejoId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('usuario')
  @Post(':id/inscripciones')
  inscribirse(@Request() req: any, @Param('id') id: string, @Body() body: { companeroEmail: string }) {
    return this.torneoService.inscribirse(id, req.user.id, body.companeroEmail);
  }
}
