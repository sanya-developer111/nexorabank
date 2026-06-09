import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SafeUser } from '../common/utils/user.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TournamentsService } from './tournaments.service';

@Controller('tournaments')
@UseGuards(JwtAuthGuard)
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Get()
  getActive(@CurrentUser() user: SafeUser, @Query() query: PaginationDto) {
    return this.tournamentsService.getActive(user.id, query);
  }

  @Post(':id/join')
  join(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.tournamentsService.join(user.id, id);
  }

  @Post(':id/score')
  submitScore(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Body('score') score: number,
  ) {
    return this.tournamentsService.submitScore(user.id, id, score);
  }

  @Get(':id/leaderboard')
  getLeaderboard(@Param('id') id: string, @Query() query: PaginationDto) {
    return this.tournamentsService.getLeaderboard(id, query);
  }
}
