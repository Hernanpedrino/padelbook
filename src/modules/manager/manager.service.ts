import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EstadoOrganizacion, MetodoPago } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { adminSelect, datosCuentaPanel } from '../../common/panel';
import { validarEnum, validarFecha } from '../../common/validacion';

type DatosPlan = {
  nombre?: string;
  descripcion?: string;
  precioMensual?: number;
  maxComplejos?: number | null;
  maxCanchas?: number | null;
  activo?: boolean;
};

type DatosOrganizacion = {
  nombre?: string;
  cuit?: string;
  emailContacto?: string;
  telefono?: string;
  planId?: string | null;
  estado?: string;
};

type DatosCuenta = { nombre?: string; email?: string; password?: string };

@Injectable()
export class ManagerService {
  constructor(private prisma: PrismaService) {}

  // --- Planes ---

  async listarPlanes() {
    return this.prisma.plan.findMany({
      include: { _count: { select: { organizaciones: true } } },
      orderBy: { precioMensual: 'asc' },
    });
  }

  async crearPlan(data: DatosPlan) {
    if (!data.nombre) throw new BadRequestException('nombre es obligatorio');
    return this.prisma.plan.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        precioMensual: this.validarMonto(data.precioMensual, 'precioMensual'),
        maxComplejos: this.validarLimite(data.maxComplejos, 'maxComplejos'),
        maxCanchas: this.validarLimite(data.maxCanchas, 'maxCanchas'),
      },
    });
  }

  async actualizarPlan(id: string, data: DatosPlan) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return this.prisma.plan.update({
      where: { id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        precioMensual: data.precioMensual !== undefined ? this.validarMonto(data.precioMensual, 'precioMensual') : undefined,
        maxComplejos: data.maxComplejos !== undefined ? this.validarLimite(data.maxComplejos, 'maxComplejos') : undefined,
        maxCanchas: data.maxCanchas !== undefined ? this.validarLimite(data.maxCanchas, 'maxCanchas') : undefined,
        activo: data.activo,
      },
    });
  }

  // --- Organizaciones ---

  async listarOrganizaciones(estado?: string) {
    return this.prisma.organizacion.findMany({
      where: { estado: estado ? validarEnum(EstadoOrganizacion, estado, 'estado') : undefined },
      include: { plan: true, _count: { select: { complejos: true, admins: true } } },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async findOrganizacion(id: string) {
    const organizacion = await this.prisma.organizacion.findUnique({
      where: { id },
      include: {
        plan: true,
        complejos: { include: { _count: { select: { canchas: true } } } },
        admins: { select: adminSelect },
      },
    });
    if (!organizacion) throw new NotFoundException('Organización no encontrada');
    return organizacion;
  }

  // Alta de un cliente: la organización y su primer SUPERADMIN en una sola operación
  async crearOrganizacion(data: DatosOrganizacion & { superadmin?: DatosCuenta }) {
    if (!data.nombre || !data.emailContacto) throw new BadRequestException('nombre y emailContacto son obligatorios');
    if (data.planId) await this.verificarPlan(data.planId);
    const cuenta = await datosCuentaPanel(this.prisma, data.superadmin ?? {});

    return this.prisma.organizacion.create({
      data: {
        nombre: data.nombre,
        cuit: data.cuit,
        emailContacto: data.emailContacto,
        telefono: data.telefono,
        planId: data.planId ?? undefined,
        admins: { create: { ...cuenta, rol: 'SUPERADMIN' } },
      },
      include: { plan: true, admins: { select: adminSelect } },
    });
  }

  async actualizarOrganizacion(id: string, data: DatosOrganizacion) {
    const organizacion = await this.prisma.organizacion.findUnique({ where: { id } });
    if (!organizacion) throw new NotFoundException('Organización no encontrada');
    if (data.planId) await this.verificarPlan(data.planId);

    return this.prisma.organizacion.update({
      where: { id },
      data: {
        nombre: data.nombre,
        cuit: data.cuit,
        emailContacto: data.emailContacto,
        telefono: data.telefono,
        planId: data.planId,
        estado: data.estado !== undefined ? validarEnum(EstadoOrganizacion, data.estado, 'estado') : undefined,
      },
      include: { plan: true },
    });
  }

  async crearSuperadmin(organizacionId: string, data: DatosCuenta) {
    const organizacion = await this.prisma.organizacion.findUnique({ where: { id: organizacionId } });
    if (!organizacion) throw new NotFoundException('Organización no encontrada');
    const cuenta = await datosCuentaPanel(this.prisma, data);

    return this.prisma.admin.create({
      data: { ...cuenta, rol: 'SUPERADMIN', organizacionId },
      select: adminSelect,
    });
  }

  // --- Pagos del servicio ---

  async pagosDeOrganizacion(organizacionId: string) {
    return this.prisma.pagoServicio.findMany({
      where: { organizacionId },
      orderBy: { periodoDesde: 'desc' },
    });
  }

  async registrarPagoServicio(organizacionId: string, data: {
    monto?: number;
    metodo?: string;
    periodoDesde?: string;
    periodoHasta?: string;
    referencia?: string;
  }) {
    const organizacion = await this.prisma.organizacion.findUnique({ where: { id: organizacionId } });
    if (!organizacion) throw new NotFoundException('Organización no encontrada');

    const periodoDesde = validarFecha(data.periodoDesde, 'periodoDesde');
    const periodoHasta = validarFecha(data.periodoHasta, 'periodoHasta');
    if (periodoHasta <= periodoDesde) throw new BadRequestException('periodoHasta tiene que ser posterior a periodoDesde');

    // El vencimiento solo avanza: un pago de un período viejo no lo acorta
    const vencimiento =
      organizacion.vencimiento && organizacion.vencimiento > periodoHasta ? organizacion.vencimiento : periodoHasta;

    const [pago] = await this.prisma.$transaction([
      this.prisma.pagoServicio.create({
        data: {
          organizacionId,
          monto: this.validarMonto(data.monto, 'monto'),
          metodo: validarEnum(MetodoPago, data.metodo, 'metodo'),
          periodoDesde,
          periodoHasta,
          referencia: data.referencia,
        },
      }),
      this.prisma.organizacion.update({ where: { id: organizacionId }, data: { vencimiento } }),
    ]);
    return pago;
  }

  private async verificarPlan(planId: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.activo) throw new BadRequestException('Plan inexistente o inactivo');
  }

  private validarMonto(valor: unknown, campo: string) {
    if (typeof valor !== 'number' || valor < 0) throw new BadRequestException(`${campo} debe ser un número >= 0`);
    return valor;
  }

  private validarLimite(valor: unknown, campo: string) {
    if (valor === undefined || valor === null) return null;
    if (!Number.isInteger(valor) || (valor as number) < 1) {
      throw new BadRequestException(`${campo} debe ser un entero mayor a 0, o null para sin límite`);
    }
    return valor as number;
  }
}
