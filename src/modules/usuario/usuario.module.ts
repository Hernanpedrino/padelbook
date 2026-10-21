import { Module } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { UsuarioController } from './usuario.controller';
import { NovedadesService } from './novedades.service';

@Module({
  providers: [UsuarioService, NovedadesService],
  controllers: [UsuarioController],
})
export class UsuarioModule {}
