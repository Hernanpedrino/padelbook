import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CanchaService {
  constructor(private prisma: PrismaService) {}

  async findByComplejo(complejoId: string) {
    return this.prisma.cancha.findMany({
      where: { complejoId },
    });
  }

  async create(complejoId: string, data: { nombre: string; tipo: string }) {
    // El límite del plan cuenta las canchas de toda la organización
    const complejo = await this.prisma.complejo.findUnique({
      where: { id: complejoId },
      include: { organizacion: { include: { plan: true } } },
    });
    const max = complejo?.organizacion.plan?.maxCanchas;
    if (max) {
      const total = await this.prisma.cancha.count({
        where: { complejo: { organizacionId: complejo.organizacionId } },
      });
      if (total >= max) throw new BadRequestException(`Tu plan permite hasta ${max} cancha(s)`);
    }

    return this.prisma.cancha.create({
      data: { ...data, complejoId },
    });
  }

  async update(id: string, complejoId: string, data: { nombre?: string; tipo?: string; activa?: boolean }) {
    const cancha = await this.prisma.cancha.findFirst({
      where: { id, complejoId },
    });
    if (!cancha) throw new NotFoundException('Cancha no encontrada');

    return this.prisma.cancha.update({
      where: { id },
      data,
    });
  }
}