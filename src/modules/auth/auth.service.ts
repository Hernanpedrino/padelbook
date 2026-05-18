import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) { }

  async loginAdmin(email: string, password: string) {
    const admin = await this.prisma.admin.findUnique({ where: { email } });
    if (!admin) throw new UnauthorizedException('Credenciales inválidas');

    const valido = await bcrypt.compare(password, admin.passwordHash);
    if (!valido) throw new UnauthorizedException('Credenciales inválidas');

    const payload = { sub: admin.id, email: admin.email, rol: 'admin', complejoId: admin.complejoId };
    return { token: this.jwt.sign(payload) };
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
        passwordHash,
      },
    });

    const payload = { sub: usuario.id, email: usuario.email, rol: 'usuario' };
    return { token: this.jwt.sign(payload) };
  }
}