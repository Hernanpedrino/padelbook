import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ReservaService } from './reserva.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('reservas')
export class ReservaController {
  constructor(private reservaService: ReservaService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('usuario')
  @Post()
  crear(@Request() req: any, @Body() body: { turnoId: string }) {
    return this.reservaService.crear(req.user.id, body.turnoId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('usuario')
  @Patch(':id/cancelar')
  cancelar(@Request() req: any, @Param('id') id: string) {
    return this.reservaService.cancelar(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('usuario')
  @Get('mis-reservas')
  misReservas(@Request() req: any) {
    return this.reservaService.findByUsuario(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  findByComplejo(@Request() req: any) {
    return this.reservaService.findByComplejo(req.user.complejoId);
  }
}