import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ComplejoModule } from './modules/complejo/complejo.module';

@Module({
  imports: [ComplejoModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
