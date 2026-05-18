import { Module } from '@nestjs/common';
import { TurnoFijoService } from './turno-fijo.service';
import { TurnoFijoController } from './turno-fijo.controller';

@Module({
  providers: [TurnoFijoService],
  controllers: [TurnoFijoController],
  exports: [TurnoFijoService],
})
export class TurnoFijoModule {}