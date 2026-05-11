import { Module } from '@nestjs/common';
import { CanchaService } from './cancha.service';
import { CanchaController } from './cancha.controller';

@Module({
  providers: [CanchaService],
  controllers: [CanchaController],
})
export class CanchaModule {}