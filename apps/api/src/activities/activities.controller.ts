import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SafeUser } from '../common/utils/user.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActivitiesService } from './activities.service';

@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get('videos')
  getVideos(@CurrentUser() user: SafeUser) {
    return this.activitiesService.getVideoStatus(user.id);
  }

  @Get('videos/list')
  listVideos() {
    return this.activitiesService.listVideos();
  }

  @Post('videos/claim')
  claimVideo(
    @CurrentUser() user: SafeUser,
    @Body() body: { videoId: string; watchedSeconds: number },
  ) {
    return this.activitiesService.claimVideoReward(user.id, body.videoId, body.watchedSeconds ?? 0);
  }

  @Get('daily-tasks')
  getDailyTasks(@CurrentUser() user: SafeUser) {
    return this.activitiesService.getDailyTasks(user.id);
  }
}
