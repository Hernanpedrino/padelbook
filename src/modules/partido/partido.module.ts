import { Module } from '@nestjs/common';
import { PartidoService } from './partido.service';
import { PartidoController } from './partido.controller';

@Module({
  providers: [PartidoService],
  controllers: [PartidoController],
})
export class PartidoModule {}
