import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { QuestPeriod } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SafeUser } from '../common/utils/user.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuestsService } from './quests.service';

@Controller('quests')
@UseGuards(JwtAuthGuard)
export class QuestsController {
  constructor(private readonly questsService: QuestsService) {}

  @Get()
  getQuests(
    @CurrentUser() user: SafeUser,
    @Query('period') period?: QuestPeriod,
  ) {
    return this.questsService.getQuests(user.id, period);
  }

  @Post(':questId/claim')
  claimReward(@CurrentUser() user: SafeUser, @Param('questId') questId: string) {
    return this.questsService.claimReward(user.id, questId);
  }
}
