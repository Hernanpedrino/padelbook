import { BadRequestException } from '@nestjs/common';

// No hay ValidationPipe: los servicios validan enums y fechas que llegan en el body
export function validarEnum<T extends Record<string, string>>(
  enumerado: T,
  valor: unknown,
  campo: string,
): T[keyof T] {
  if (typeof valor !== 'string' || !Object.values(enumerado).includes(valor)) {
    throw new BadRequestException(`${campo} inválido. Valores posibles: ${Object.values(enumerado).join(', ')}`);
  }
  return valor as T[keyof T];
}

export function validarFecha(valor: unknown, campo: string): Date {
  const fecha = new Date(valor as string);
  if (typeof valor !== 'string' || isNaN(fecha.getTime())) {
    throw new BadRequestException(`${campo} debe ser una fecha ISO válida`);
  }
  return fecha;
}

export function validarEnteroPositivo(valor: unknown, campo: string): number {
  if (!Number.isInteger(valor) || (valor as number) < 1) {
    throw new BadRequestException(`${campo} debe ser un entero mayor a 0`);
  }
  return valor as number;
}
