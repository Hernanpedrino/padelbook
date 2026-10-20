import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles) return true;
    const { user } = context.switchToHttp().getRequest();

    // @Roles('admin') protege la operación de un complejo: también la puede hacer
    // el SUPERADMIN, pero solo con un complejo elegido. Sin complejoId las consultas
    // filtradas por complejo quedarían sin filtro.
    if (roles.includes('admin') && (user.rol === 'admin' || user.rol === 'superadmin')) {
      if (!user.complejoId) {
        throw new BadRequestException('Elegí un complejo (header X-Complejo-Id)');
      }
      return true;
    }

    return roles.includes(user.rol);
  }
}
