import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Una cancha está ocupada si se solapa con un turno no cancelado o una clase publicada.
// Dos rangos se solapan cuando cada uno empieza antes de que termine el otro.
export async function verificarCanchaLibre(
  prisma: PrismaService,
  canchaId: string,
  inicio: Date,
  fin: Date,
) {
  if (fin <= inicio) throw new BadRequestException('El horario de fin tiene que ser posterior al de inicio');

  const turno = await prisma.turno.findFirst({
    where: {
      canchaId,
      estado: { not: 'CANCELADO' },
      fechaHoraInicio: { lt: fin },
      fechaHoraFin: { gt: inicio },
    },
  });
  if (turno) throw new BadRequestException('Ya existe un turno en ese horario');

  const clase = await prisma.clase.findFirst({
    where: {
      canchaId,
      estado: 'PUBLICADA',
      fechaHoraInicio: { lt: fin },
      fechaHoraFin: { gt: inicio },
    },
  });
  if (clase) throw new BadRequestException('Hay una clase en esa cancha en ese horario');
}
