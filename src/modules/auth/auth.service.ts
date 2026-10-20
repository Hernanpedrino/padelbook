import { BadRequestException, Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Categoria, Genero } from '@prisma/client';
import { validarEnum } from '../../common/validacion';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) { }

  async loginAdmin(email: string, password: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { email },
      include: { organizacion: true },
    });
    if (!admin) throw new UnauthorizedException('Credenciales inválidas');

    const valido = await bcrypt.compare(password, admin.passwordHash);
    if (!valido) throw new UnauthorizedException('Credenciales inválidas');
    if (!admin.activo) throw new UnauthorizedException('Usuario deshabilitado');
    if (admin.organizacion && admin.organizacion.estado !== 'ACTIVA') {
      throw new UnauthorizedException('La cuenta de la organización está suspendida');
    }

    // Organización y complejo no van en el token: la estrategia JWT los lee de la base
    const rol = admin.rol.toLowerCase();
    const payload = { sub: admin.id, email: admin.email, rol };
    return {
      token: this.jwt.sign(payload),
      rol,
      nombre: admin.nombre,
      complejoId: admin.complejoId,
    };
  }

  async loginUsuario(email: string, password: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    if (!usuario) throw new UnauthorizedException('Credenciales inválidas');

    const valido = await bcrypt.compare(password, usuario.passwordHash);
    if (!valido) throw new UnauthorizedException('Credenciales inválidas');

    const payload = { sub: usuario.id, email: usuario.email, rol: 'usuario' };
    return { token: this.jwt.sign(payload) };
  }

  async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }
  async registrarUsuario(data: {
    nombre: string;
    apellido: string;
    email: string;
    telefono: string;
    password: string;
    categoria?: string;
    genero?: string;
  }) {
    const existe = await this.prisma.usuario.findUnique({
      where: { email: data.email },
    });
    if (existe) throw new BadRequestException('El email ya está registrado');

    const passwordHash = await this.hashPassword(data.password);

    const usuario = await this.prisma.usuario.create({
      data: {
        nombre: data.nombre,
        apellido: data.apellido,
        email: data.email,
        telefono: data.telefono,
        categoria: data.categoria ? validarEnum(Categoria, data.categoria, 'categoria') : undefined,
        genero: data.genero ? validarEnum(Genero, data.genero, 'genero') : undefined,
        passwordHash,
      },
    });

    const payload = { sub: usuario.id, email: usuario.email, rol: 'usuario' };
    return { token: this.jwt.sign(payload) };
  }
  async buscarUsuario(email: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      select: { id: true, nombre: true, apellido: true, email: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }
}