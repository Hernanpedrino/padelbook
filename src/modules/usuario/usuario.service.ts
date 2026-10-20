import { Injectable, NotFoundException } from '@nestjs/common';
import { Categoria, Genero } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { validarEnum } from '../../common/validacion';

const perfilSelect = {
  id: true,
  nombre: true,
  apellido: true,
  email: true,
  telefono: true,
  categoria: true,
  genero: true,
  creadoEn: true,
};

@Injectable()
export class UsuarioService {
  constructor(private prisma: PrismaService) {}

  async getPerfil(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: perfilSelect,
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  async updatePerfil(id: string, data: {
    nombre?: string;
    apellido?: string;
    telefono?: string;
    categoria?: string;
    genero?: string;
  }) {
    return this.prisma.usuario.update({
      where: { id },
      data: {
        nombre: data.nombre,
        apellido: data.apellido,
        telefono: data.telefono,
        categoria: data.categoria !== undefined ? validarEnum(Categoria, data.categoria, 'categoria') : undefined,
        genero: data.genero !== undefined ? validarEnum(Genero, data.genero, 'genero') : undefined,
      },
      select: perfilSelect,
    });
  }
}
