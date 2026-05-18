import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TurnoFijoService {
    constructor(private prisma: PrismaService) { }

    async findByComplejo(complejoId: string) {
        return this.prisma.turnoFijo.findMany({
            where: { cancha: { complejoId } },
            include: { cancha: true, usuario: true },
            orderBy: { diaSemana: 'asc' },
        });
    }

    async crear(complejoId: string, data: {
        canchaId: string;
        usuarioId: string;
        diaSemana: string;
        horaInicio: string;
        horaFin: string;
        fechaDesde: string;
        fechaHasta?: string;
        precio: number;
    }) {
        const cancha = await this.prisma.cancha.findFirst({
            where: { id: data.canchaId, complejoId },
        });
        if (!cancha) throw new NotFoundException('Cancha no encontrada');

        const usuario = await this.prisma.usuario.findUnique({
            where: { id: data.usuarioId },
        });
        if (!usuario) throw new NotFoundException('Usuario no encontrado');

        return this.prisma.turnoFijo.create({
            data: {
                canchaId: data.canchaId,
                usuarioId: data.usuarioId,
                diaSemana: data.diaSemana,
                horaInicio: data.horaInicio,
                horaFin: data.horaFin,
                fechaDesde: new Date(data.fechaDesde),
                fechaHasta: data.fechaHasta ? new Date(data.fechaHasta) : null,
            },
            include: { cancha: true, usuario: true },
        });
    }

    async desactivar(id: string, complejoId: string) {
        const turnoFijo = await this.prisma.turnoFijo.findFirst({
            where: { id, cancha: { complejoId } },
        });
        if (!turnoFijo) throw new NotFoundException('Turno fijo no encontrado');

        return this.prisma.turnoFijo.update({
            where: { id },
            data: { activo: false },
        });
    }

    async generarTurnos(complejoId: string, data: {
        turnoFijoId: string;
        fechaDesde: string;
        fechaHasta: string;
        precio: number;
    }) {
        const turnoFijo = await this.prisma.turnoFijo.findFirst({
            where: { id: data.turnoFijoId, cancha: { complejoId } },
        });
        if (!turnoFijo) throw new NotFoundException('Turno fijo no encontrado');
        if (!turnoFijo.activo) throw new BadRequestException('El turno fijo está inactivo');

        const diasSemana: Record<string, number> = {
            lunes: 1, martes: 2, miercoles: 3, jueves: 4,
            viernes: 5, sabado: 6, domingo: 0,
        };

        const diaBuscado = diasSemana[turnoFijo.diaSemana.toLowerCase()];
        const desde = new Date(data.fechaDesde);
        const hasta = new Date(data.fechaHasta);
        const turnos: {
            canchaId: string;
            turnoFijoId: string;
            fechaHoraInicio: Date;
            fechaHoraFin: Date;
            precio: number;
            estado: 'RESERVADO';
        }[] = [];
        const current = new Date(desde);

        while (current <= hasta) {
            if (current.getDay() === diaBuscado) {
                const [hIni, mIni] = turnoFijo.horaInicio.split(':').map(Number);
                const [hFin, mFin] = turnoFijo.horaFin.split(':').map(Number);

                const inicio = new Date(current);
                inicio.setHours(hIni, mIni, 0, 0);

                const fin = new Date(current);
                fin.setHours(hFin, mFin, 0, 0);

                const conflicto = await this.prisma.turno.findFirst({
                    where: {
                        canchaId: turnoFijo.canchaId,
                        estado: { not: 'CANCELADO' },
                        fechaHoraInicio: inicio,
                    },
                });

                if (!conflicto) {
                    turnos.push({
                        canchaId: turnoFijo.canchaId,
                        turnoFijoId: turnoFijo.id,
                        fechaHoraInicio: inicio,
                        fechaHoraFin: fin,
                        precio: data.precio,
                        estado: 'RESERVADO' as const,
                    });
                }
            }
            current.setDate(current.getDate() + 1);
        }

        if (turnos.length === 0) {
            throw new BadRequestException('No hay fechas disponibles en el rango seleccionado');
        }

        await this.prisma.turno.createMany({ data: turnos });
        return { generados: turnos.length };
    }
}