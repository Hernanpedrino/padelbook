import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CanchaService } from './cancha.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('canchas')
export class CanchaController {
  constructor(private canchaService: CanchaService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  findAll(@Request() req: any) {
    return this.canchaService.findByComplejo(req.user.complejoId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  create(@Request() req: any, @Body() body: { nombre: string; tipo: string }) {
    return this.canchaService.create(req.user.complejoId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { nombre?: string; tipo?: string; activa?: boolean },
  ) {
    return this.canchaService.update(id, req.user.complejoId, body);
  }
}