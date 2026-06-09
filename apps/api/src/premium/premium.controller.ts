import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SafeUser } from '../common/utils/user.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PremiumService } from './premium.service';

@Controller('premium')
@UseGuards(JwtAuthGuard)
export class PremiumController {
  constructor(private readonly premiumService: PremiumService) {}

  @Get('plans')
  getPlans() {
    return this.premiumService.getPlans();
  }

  @Get('status')
  getStatus(@CurrentUser() user: SafeUser) {
    return this.premiumService.getStatus(user.id);
  }

  @Get()
  getStatusRoot(@CurrentUser() user: SafeUser) {
    return this.premiumService.getStatus(user.id);
  }

  @Post('subscribe')
  subscribe(@CurrentUser() user: SafeUser, @Body('planId') planId?: string) {
    return this.premiumService.subscribe(user.id, planId ?? 'starter');
  }
}
