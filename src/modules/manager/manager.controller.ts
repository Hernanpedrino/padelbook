import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ManagerService } from './manager.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

type BodyPlan = {
  nombre?: string;
  descripcion?: string;
  precioMensual?: number;
  maxComplejos?: number | null;
  maxCanchas?: number | null;
  activo?: boolean;
};

type BodyOrganizacion = {
  nombre?: string;
  cuit?: string;
  emailContacto?: string;
  telefono?: string;
  planId?: string | null;
  estado?: string;
};

type BodyCuenta = { nombre?: string; email?: string; password?: string };

@Controller('manager')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('manager')
export class ManagerController {
  constructor(private managerService: ManagerService) {}

  @Get('planes')
  listarPlanes() {
    return this.managerService.listarPlanes();
  }

  @Post('planes')
  crearPlan(@Body() body: BodyPlan) {
    return this.managerService.crearPlan(body);
  }

  @Patch('planes/:id')
  actualizarPlan(@Param('id') id: string, @Body() body: BodyPlan) {
    return this.managerService.actualizarPlan(id, body);
  }

  @Get('organizaciones')
  listarOrganizaciones(@Query('estado') estado?: string) {
    return this.managerService.listarOrganizaciones(estado);
  }

  @Post('organizaciones')
  crearOrganizacion(@Body() body: BodyOrganizacion & { superadmin?: BodyCuenta }) {
    return this.managerService.crearOrganizacion(body);
  }

  @Get('organizaciones/:id')
  findOrganizacion(@Param('id') id: string) {
    return this.managerService.findOrganizacion(id);
  }

  @Patch('organizaciones/:id')
  actualizarOrganizacion(@Param('id') id: string, @Body() body: BodyOrganizacion) {
    return this.managerService.actualizarOrganizacion(id, body);
  }

  @Post('organizaciones/:id/superadmins')
  crearSuperadmin(@Param('id') id: string, @Body() body: BodyCuenta) {
    return this.managerService.crearSuperadmin(id, body);
  }

  @Get('organizaciones/:id/pagos')
  pagos(@Param('id') id: string) {
    return this.managerService.pagosDeOrganizacion(id);
  }

  @Post('organizaciones/:id/pagos')
  registrarPago(@Param('id') id: string, @Body() body: {
    monto?: number;
    metodo?: string;
    periodoDesde?: string;
    periodoHasta?: string;
    referencia?: string;
  }) {
    return this.managerService.registrarPagoServicio(id, body);
  }
}
