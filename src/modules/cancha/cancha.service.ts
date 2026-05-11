import { Injectable, NotFoundException } from '@nestjs/common';
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