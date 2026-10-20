import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

const ROLES_PANEL = ['manager', 'superadmin', 'admin'];

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET as string,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    if (!ROLES_PANEL.includes(payload.rol)) {
      return { id: payload.sub, email: payload.email, rol: payload.rol };
    }

    // Usuarios del panel: se leen de la base en cada request para que una baja o
    // suspensión tenga efecto inmediato, sin esperar a que venza el token
    const admin = await this.prisma.admin.findUnique({
      where: { id: payload.sub },
      include: { organizacion: true },
    });
    if (!admin || !admin.activo) throw new UnauthorizedException('Usuario deshabilitado');
    if (admin.organizacion && admin.organizacion.estado !== 'ACTIVA') {
      throw new UnauthorizedException('La cuenta de la organización está suspendida');
    }

    let complejoId = admin.complejoId ?? undefined;

    // El SUPERADMIN elige con qué complejo opera mediante el header X-Complejo-Id
    if (admin.rol === 'SUPERADMIN') {
      const elegido = req.headers['x-complejo-id'];
      complejoId = undefined;
      if (typeof elegido === 'string' && elegido) {
        const complejo = await this.prisma.complejo.findFirst({
          where: { id: elegido, organizacionId: admin.organizacionId! },
        });
        if (!complejo) throw new BadRequestException('El complejo no pertenece a tu organización');
        complejoId = complejo.id;
      }
    }

    return {
      id: admin.id,
      email: admin.email,
      rol: admin.rol.toLowerCase(),
      organizacionId: admin.organizacionId ?? undefined,
      complejoId,
    };
  }
}
