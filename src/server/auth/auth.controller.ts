import { Controller, Post, Body, HttpCode, HttpStatus, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthService } from '@server/auth/auth.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: any) {
    throw new ForbiddenException('Public registration is disabled. Please contact an administrator to create an account.');
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() body: any) {
    const shareholderId = body.shareholderId || body.id || body.username || body.phone || '';
    const password = body.password || body.pass || '';
    return this.authService.login(shareholderId, password);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: any) {
    const rawToken = req.headers.authorization?.split(' ')[1];
    return this.authService.logout(rawToken);
  }
}
