import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ComplejoModule } from './modules/complejo/complejo.module';
import { CanchaModule } from './modules/cancha/cancha.module';
import { TurnoModule } from './modules/turno/turno.module';
import { ReservaModule } from './modules/reserva/reserva.module';
import { TurnoFijoModule } from './modules/turno-fijo/turno-fijo.module';

@Module({
  imports: [PrismaModule, AuthModule, ComplejoModule, CanchaModule, TurnoModule, ReservaModule, TurnoFijoModule],
})
export class AppModule {}