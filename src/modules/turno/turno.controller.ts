import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TurnoService } from './turno.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('turnos')
export class TurnoController {
  constructor(private turnoService: TurnoService) {}

  @Get('disponibles/:complejoId')
  findDisponibles(@Param('complejoId') complejoId: string) {
    return this.turnoService.findDisponiblesByComplejo(complejoId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  findAll(@Request() req: any) {
    return this.turnoService.findByComplejo(req.user.complejoId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  create(@Request() req: any, @Body() body: {
    canchaId: string;
    fechaHoraInicio: string;
    fechaHoraFin: string;
    precio: number;
  }) {
    return this.turnoService.create(req.user.complejoId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/cancelar')
  cancelar(@Request() req: any, @Param('id') id: string) {
    return this.turnoService.cancelar(id, req.user.complejoId);
  }
}