import { Module } from '@nestjs/common';
import { OrganizacionService } from './organizacion.service';
import { OrganizacionController } from './organizacion.controller';

@Module({
  providers: [OrganizacionService],
  controllers: [OrganizacionController],
})
export class OrganizacionModule {}
