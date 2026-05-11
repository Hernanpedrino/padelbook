import { Module } from '@nestjs/common';
import { ComplejoService } from './complejo.service';
import { ComplejoController } from './complejo.controller';

@Module({
  providers: [ComplejoService],
  controllers: [ComplejoController],
  exports: [ComplejoService],
})
export class ComplejoModule {}