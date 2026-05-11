import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ComplejoService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.complejo.findUnique({
      where: { id },
      include: { canchas: true },
    });
  }

  async update(id: string, data: { nombre?: string; direccion?: string; telefono?: string }) {
    return this.prisma.complejo.update({
      where: { id },
      data,
    });
  }

  async findAll() {
    return this.prisma.complejo.findMany({
      include: { canchas: { where: { activa: true } } },
    });
  }
}