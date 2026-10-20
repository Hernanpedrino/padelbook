import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ClaseService } from './clase.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('clases')
export class ClaseController {
  constructor(private claseService: ClaseService) {}

  @Get()
  listarPublicadas(@Query('complejoId') complejoId?: string, @Query('nivel') nivel?: string) {
    return this.claseService.listarPublicadas({ complejoId, nivel });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('mi-complejo')
  findByComplejo(@Request() req: any) {
    return this.claseService.findByComplejo(req.user.complejoId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('usuario')
  @Get('mis-inscripciones')
  misInscripciones(@Request() req: any) {
    return this.claseService.misInscripciones(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  crear(@Request() req: any, @Body() body: {
    canchaId: string;
    profesor: string;
    nivel?: string;
    descripcion?: string;
    fechaHoraInicio: string;
    fechaHoraFin: string;
    cupo: number;
    precio: number;
  }) {
    return this.claseService.crear(req.user.complejoId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('inscripciones/:id')
  responderInscripcion(@Request() req: any, @Param('id') id: string, @Body() body: { estado: string }) {
    return this.claseService.responderInscripcion(id, req.user.complejoId, body.estado);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('usuario')
  @Patch('inscripciones/:id/cancelar')
  cancelarInscripcion(@Request() req: any, @Param('id') id: string) {
    return this.claseService.cancelarInscripcion(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/cancelar')
  cancelar(@Request() req: any, @Param('id') id: string) {
    return this.claseService.cancelar(id, req.user.complejoId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get(':id/inscripciones')
  inscripciones(@Request() req: any, @Param('id') id: string) {
    return this.claseService.inscripcionesDeLaClase(id, req.user.complejoId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('usuario')
  @Post(':id/inscripciones')
  inscribirse(@Request() req: any, @Param('id') id: string) {
    return this.claseService.inscribirse(id, req.user.id);
  }
}
