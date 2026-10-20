import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

// Campos de Admin que se pueden exponer
export const adminSelect = {
  id: true,
  rol: true,
  nombre: true,
  email: true,
  activo: true,
  organizacionId: true,
  complejoId: true,
};

export async function datosCuentaPanel(
  prisma: PrismaService,
  data: { nombre?: string; email?: string; password?: string },
) {
  if (!data.nombre || !data.email) throw new BadRequestException('nombre y email son obligatorios');
  if (!data.password || data.password.length < 8) {
    throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
  }
  const existe = await prisma.admin.findUnique({ where: { email: data.email } });
  if (existe) throw new BadRequestException('Ya existe un usuario del panel con ese email');

  return {
    nombre: data.nombre,
    email: data.email,
    passwordHash: await bcrypt.hash(data.password, 10),
  };
}
