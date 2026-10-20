import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ComplejoModule } from './modules/complejo/complejo.module';
import { CanchaModule } from './modules/cancha/cancha.module';
import { TurnoModule } from './modules/turno/turno.module';
import { ReservaModule } from './modules/reserva/reserva.module';
import { TurnoFijoModule } from './modules/turno-fijo/turno-fijo.module';
import { UsuarioModule } from './modules/usuario/usuario.module';
import { PartidoModule } from './modules/partido/partido.module';
import { TorneoModule } from './modules/torneo/torneo.module';
import { ClaseModule } from './modules/clase/clase.module';
import { PagoModule } from './modules/pago/pago.module';
import { ManagerModule } from './modules/manager/manager.module';
import { OrganizacionModule } from './modules/organizacion/organizacion.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ComplejoModule,
    CanchaModule,
    TurnoModule,
    ReservaModule,
    TurnoFijoModule,
    UsuarioModule,
    PartidoModule,
    TorneoModule,
    ClaseModule,
    PagoModule,
    ManagerModule,
    OrganizacionModule,
  ],
})
export class AppModule {}