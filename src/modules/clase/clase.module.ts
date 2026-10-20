import { Module } from '@nestjs/common';
import { ClaseService } from './clase.service';
import { ClaseController } from './clase.controller';

@Module({
  providers: [ClaseService],
  controllers: [ClaseController],
})
export class ClaseModule {}
