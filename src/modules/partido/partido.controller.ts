import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { PartidoService } from './partido.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('partidos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('usuario')
export class PartidoController {
  constructor(private partidoService: PartidoService) {}

  @Get()
  listar(
    @Query('categoria') categoria?: string,
    @Query('rama') rama?: string,
    @Query('complejoId') complejoId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.partidoService.listarAbiertos({ categoria, rama, complejoId, desde, hasta });
  }

  @Get('mis-partidos')
  misPartidos(@Request() req: any) {
    return this.partidoService.misPartidos(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partidoService.findById(id);
  }

  @Post()
  crear(@Request() req: any, @Body() body: {
    turnoId: string;
    categoria: string;
    rama: string;
    jugadoresBuscados: number;
    descripcion?: string;
  }) {
    return this.partidoService.crear(req.user.id, body);
  }

  @Patch(':id/cancelar')
  cancelar(@Request() req: any, @Param('id') id: string) {
    return this.partidoService.cancelar(id, req.user.id);
  }

  @Post(':id/solicitudes')
  solicitarUnirse(@Request() req: any, @Param('id') id: string) {
    return this.partidoService.solicitarUnirse(id, req.user.id);
  }

  @Patch(':id/solicitudes/salir')
  salir(@Request() req: any, @Param('id') id: string) {
    return this.partidoService.salir(id, req.user.id);
  }

  @Patch(':id/solicitudes/:solicitudId')
  responderSolicitud(
    @Request() req: any,
    @Param('id') id: string,
    @Param('solicitudId') solicitudId: string,
    @Body() body: { estado: string },
  ) {
    return this.partidoService.responderSolicitud(id, solicitudId, req.user.id, body.estado);
  }
}
