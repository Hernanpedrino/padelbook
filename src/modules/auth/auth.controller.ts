import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

class LoginDto {
  email: string = '';
  password: string = '';
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('admin/login')
  loginAdmin(@Body() dto: LoginDto) {
    return this.auth.loginAdmin(dto.email, dto.password);
  }

  @Post('usuario/login')
  loginUsuario(@Body() dto: LoginDto) {
    return this.auth.loginUsuario(dto.email, dto.password);
  }
}