import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Public()
  @Get()
  getLeaderboard(@Query('type') type?: 'wealth' | 'level' | 'investments') {
    return this.leaderboardService.getLeaderboard(type ?? 'wealth');
  }
}
