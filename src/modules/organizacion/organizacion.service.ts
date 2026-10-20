import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { adminSelect, datosCuentaPanel } from '../../common/panel';

type DatosComplejo = { nombre?: string; direccion?: string; telefono?: string; email?: string };

@Injectable()
export class OrganizacionService {
  constructor(private prisma: PrismaService) {}

  async miOrganizacion(organizacionId: string) {
    return this.prisma.organizacion.findUnique({
      where: { id: organizacionId },
      include: {
        plan: true,
        complejos: { include: { _count: { select: { canchas: true } } }, orderBy: { nombre: 'asc' } },
      },
    });
  }

  // --- Complejos ---

  async crearComplejo(organizacionId: string, data: DatosComplejo) {
    if (!data.nombre || !data.direccion || !data.telefono || !data.email) {
      throw new BadRequestException('nombre, direccion, telefono y email son obligatorios');
    }

    const organizacion = await this.prisma.organizacion.findUnique({
      where: { id: organizacionId },
      include: { plan: true, _count: { select: { complejos: true } } },
    });
    const max = organizacion?.plan?.maxComplejos;
    if (max && organizacion._count.complejos >= max) {
      throw new BadRequestException(`Tu plan permite hasta ${max} complejo(s)`);
    }

    const existe = await this.prisma.complejo.findUnique({ where: { email: data.email } });
    if (existe) throw new BadRequestException('Ya existe un complejo con ese email');

    return this.prisma.complejo.create({
      data: {
        organizacionId,
        nombre: data.nombre,
        direccion: data.direccion,
        telefono: data.telefono,
        email: data.email,
      },
    });
  }

  async actualizarComplejo(id: string, organizacionId: string, data: DatosComplejo & { pagosHabilitados?: boolean }) {
    const complejo = await this.prisma.complejo.findFirst({ where: { id, organizacionId } });
    if (!complejo) throw new NotFoundException('Complejo no encontrado');

    return this.prisma.complejo.update({
      where: { id },
      data: {
        nombre: data.nombre,
        direccion: data.direccion,
        telefono: data.telefono,
        email: data.email,
        pagosHabilitados: data.pagosHabilitados,
      },
    });
  }

  // --- Usuarios del panel de la organización ---

  async listarAdmins(organizacionId: string) {
    return this.prisma.admin.findMany({
      where: { organizacionId },
      select: { ...adminSelect, complejo: { select: { id: true, nombre: true } } },
      orderBy: [{ rol: 'asc' }, { nombre: 'asc' }],
    });
  }

  async crearAdmin(organizacionId: string, data: {
    nombre?: string;
    email?: string;
    password?: string;
    complejoId?: string;
  }) {
    await this.verificarComplejo(data.complejoId, organizacionId);
    const cuenta = await datosCuentaPanel(this.prisma, data);

    return this.prisma.admin.create({
      data: { ...cuenta, rol: 'ADMIN', organizacionId, complejoId: data.complejoId },
      select: adminSelect,
    });
  }

  // Solo se gestionan ADMIN; los SUPERADMIN los administra el MANAGER
  async actualizarAdmin(id: string, organizacionId: string, data: {
    nombre?: string;
    complejoId?: string;
    activo?: boolean;
    password?: string;
  }) {
    const admin = await this.prisma.admin.findFirst({ where: { id, organizacionId, rol: 'ADMIN' } });
    if (!admin) throw new NotFoundException('Administrador no encontrado');
    if (data.complejoId !== undefined) await this.verificarComplejo(data.complejoId, organizacionId);
    if (data.password !== undefined && data.password.length < 8) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
    }

    return this.prisma.admin.update({
      where: { id },
      data: {
        nombre: data.nombre,
        complejoId: data.complejoId,
        activo: data.activo,
        passwordHash: data.password ? await bcrypt.hash(data.password, 10) : undefined,
      },
      select: adminSelect,
    });
  }

  private async verificarComplejo(complejoId: string | undefined, organizacionId: string) {
    if (!complejoId) throw new BadRequestException('complejoId es obligatorio');
    const complejo = await this.prisma.complejo.findFirst({ where: { id: complejoId, organizacionId } });
    if (!complejo) throw new BadRequestException('El complejo no pertenece a tu organización');
  }
}
