import { Controller, Get, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ComplejoService } from './complejo.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('complejos')
export class ComplejoController {
  constructor(private complejoService: ComplejoService) {}

  @Get()
  findAll() {
    return this.complejoService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('mi-complejo')
  getMiComplejo(@Request() req: any) {
    return this.complejoService.findById(req.user.complejoId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('mi-complejo')
  update(@Request() req: any, @Body() body: { nombre?: string; direccion?: string; telefono?: string }) {
    return this.complejoService.update(req.user.complejoId, body);
  }
}