import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { PagoService } from './pago.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('pagos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class PagoController {
  constructor(private pagoService: PagoService) {}

  @Get()
  listar(@Request() req: any, @Query('estado') estado?: string) {
    return this.pagoService.listar(req.user.complejoId, estado);
  }

  @Post()
  registrar(@Request() req: any, @Body() body: {
    reservaId?: string;
    inscripcionTorneoId?: string;
    inscripcionClaseId?: string;
    monto: number;
    metodo: string;
    estado?: string;
    referencia?: string;
  }) {
    return this.pagoService.registrar(req.user.complejoId, body);
  }

  @Patch(':id')
  actualizarEstado(@Request() req: any, @Param('id') id: string, @Body() body: { estado: string }) {
    return this.pagoService.actualizarEstado(id, req.user.complejoId, body.estado);
  }
}
