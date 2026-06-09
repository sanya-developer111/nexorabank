import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { SafeUser } from '../common/utils/user.util';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { TwoFactorVerifyDto } from './dto/two-factor.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  setup2FA(@CurrentUser() user: SafeUser) {
    return this.authService.setup2FA(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  enable2FA(@CurrentUser() user: SafeUser, @Body() dto: TwoFactorVerifyDto) {
    return this.authService.enable2FA(user.id, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('2fa')
  disable2FA(@CurrentUser() user: SafeUser, @Body() dto: TwoFactorVerifyDto) {
    return this.authService.disable2FA(user.id, dto.code);
  }
}
