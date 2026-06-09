import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SafeUser } from '../common/utils/user.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReferralService } from './referral.service';

@Controller('referral')
@UseGuards(JwtAuthGuard)
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get()
  getReferralInfo(@CurrentUser() user: SafeUser) {
    return this.referralService.getReferralInfo(user.id);
  }

  @Get('leaderboard')
  getLeaderboard() {
    return this.referralService.getReferralLeaderboard();
  }
}
