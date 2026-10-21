import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { complejoVisible } from '../../common/selects';
import { torneoActivo } from '../torneo/torneo.service';
import { claseActiva } from '../clase/clase.service';

@Injectable()
export class ComplejoService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.complejo.findUnique({
      where: { id },
      include: { canchas: true },
    });
  }

  async update(id: string, data: { nombre?: string; direccion?: string; telefono?: string; pagosHabilitados?: boolean }) {
    return this.prisma.complejo.update({
      where: { id },
      data,
    });
  }

  // Lo que espera una acción del panel; lo usa el menú para mostrar los indicadores
  async pendientes(complejoId: string) {
    const complejo = await this.prisma.complejo.findUnique({ where: { id: complejoId } });
    const [torneos, clases, pagos] = await Promise.all([
      this.prisma.inscripcionTorneo.count({
        where: { estado: 'PENDIENTE', torneo: { complejoId, ...torneoActivo } },
      }),
      this.prisma.inscripcionClase.count({
        where: { estado: 'PENDIENTE', clase: { complejoId, ...claseActiva() } },
      }),
      complejo?.pagosHabilitados
        ? this.prisma.pago.count({ where: { complejoId, estado: 'PENDIENTE' } })
        : Promise.resolve(0),
    ]);
    return { torneos, clases, pagos };
  }

  async findAll() {
    return this.prisma.complejo.findMany({
      where: complejoVisible,
      include: { canchas: { where: { activa: true } } },
    });
  }
}