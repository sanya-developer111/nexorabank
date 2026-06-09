import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SafeUser } from '../common/utils/user.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AchievementsService } from './achievements.service';

@Controller('achievements')
@UseGuards(JwtAuthGuard)
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  list(@CurrentUser() user: SafeUser) {
    return this.achievementsService.list(user.id);
  }

  @Get('unlocked')
  getUnlocked(@CurrentUser() user: SafeUser) {
    return this.achievementsService.getUnlocked(user.id);
  }
}
