import { Controller, Post, Body, UseGuards, Get, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

class LoginDto {
  email: string = '';
  password: string = '';
}


@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) { }

  @Post('admin/login')
  loginAdmin(@Body() dto: LoginDto) {
    return this.auth.loginAdmin(dto.email, dto.password);
  }

  @Post('usuario/login')
  loginUsuario(@Body() dto: LoginDto) {
    return this.auth.loginUsuario(dto.email, dto.password);
  }
  @Post('usuario/registro')
  registrarUsuario(@Body() dto: {
    nombre: string;
    apellido: string;
    email: string;
    telefono: string;
    password: string;
  }) {
    return this.auth.registrarUsuario(dto);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('usuario/buscar')
  buscarUsuario(@Query('email') email: string) {
    return this.auth.buscarUsuario(email);
  }
}