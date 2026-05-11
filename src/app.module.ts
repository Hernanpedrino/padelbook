import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ComplejoModule } from './modules/complejo/complejo.module';

@Module({
  imports: [PrismaModule, AuthModule, ComplejoModule],
})
export class AppModule {}