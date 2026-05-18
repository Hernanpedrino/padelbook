import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TurnoFijoService } from './turno-fijo.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('turnos-fijos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class TurnoFijoController {
  constructor(private turnoFijoService: TurnoFijoService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.turnoFijoService.findByComplejo(req.user.complejoId);
  }

  @Post()
  crear(@Request() req: any, @Body() body: {
    canchaId: string;
    usuarioId: string;
    diaSemana: string;
    horaInicio: string;
    horaFin: string;
    fechaDesde: string;
    fechaHasta?: string;
    precio: number;
  }) {
    return this.turnoFijoService.crear(req.user.complejoId, body);
  }

  @Patch(':id/desactivar')
  desactivar(@Request() req: any, @Param('id') id: string) {
    return this.turnoFijoService.desactivar(id, req.user.complejoId);
  }

  @Post('generar')
  generarTurnos(@Request() req: any, @Body() body: {
    turnoFijoId: string;
    fechaDesde: string;
    fechaHasta: string;
    precio: number;
  }) {
    return this.turnoFijoService.generarTurnos(req.user.complejoId, body);
  }
}