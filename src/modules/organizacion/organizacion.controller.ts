import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { OrganizacionService } from './organizacion.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

type BodyComplejo = {
  nombre?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  pagosHabilitados?: boolean;
};

@Controller('organizacion')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
export class OrganizacionController {
  constructor(private organizacionService: OrganizacionService) {}

  @Get()
  miOrganizacion(@Request() req: any) {
    return this.organizacionService.miOrganizacion(req.user.organizacionId);
  }

  @Post('complejos')
  crearComplejo(@Request() req: any, @Body() body: BodyComplejo) {
    return this.organizacionService.crearComplejo(req.user.organizacionId, body);
  }

  @Patch('complejos/:id')
  actualizarComplejo(@Request() req: any, @Param('id') id: string, @Body() body: BodyComplejo) {
    return this.organizacionService.actualizarComplejo(id, req.user.organizacionId, body);
  }

  @Get('admins')
  listarAdmins(@Request() req: any) {
    return this.organizacionService.listarAdmins(req.user.organizacionId);
  }

  @Post('admins')
  crearAdmin(@Request() req: any, @Body() body: {
    nombre?: string;
    email?: string;
    password?: string;
    complejoId?: string;
  }) {
    return this.organizacionService.crearAdmin(req.user.organizacionId, body);
  }

  @Patch('admins/:id')
  actualizarAdmin(@Request() req: any, @Param('id') id: string, @Body() body: {
    nombre?: string;
    complejoId?: string;
    activo?: boolean;
    password?: string;
  }) {
    return this.organizacionService.actualizarAdmin(id, req.user.organizacionId, body);
  }
}
