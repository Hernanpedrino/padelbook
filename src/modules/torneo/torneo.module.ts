import { Module } from '@nestjs/common';
import { TorneoService } from './torneo.service';
import { TorneoController } from './torneo.controller';

@Module({
  providers: [TorneoService],
  controllers: [TorneoController],
})
export class TorneoModule {}
