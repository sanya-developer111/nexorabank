import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountType, TransactionType } from '@prisma/client';
import { EconomyEventsService } from '../common/services/economy-events.service';
import { WalletOperationsService } from '../common/services/wallet-operations.service';
import { toNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';
import { BattlepassService } from '../battlepass/battlepass.service';
import { QuestsService } from '../quests/quests.service';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletOps: WalletOperationsService,
    private readonly questsService: QuestsService,
    private readonly battlepassService: BattlepassService,
    private readonly economyEvents: EconomyEventsService,
  ) {}

  async listVideos() {
    return this.prisma.platformVideo.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getVideoStatus(userId: string) {
    const videos = await this.listVideos();

    const watched = await this.prisma.videoWatch.findMany({
      where: { userId },
      select: { videoId: true },
    });
    const watchedIds = new Set(watched.map((w) => w.videoId));

    return videos.map((v) => ({
      id: v.id,
      slug: v.slug,
      title: v.title,
      description: v.description,
      durationSec: v.durationSec,
      baseReward: toNumber(v.baseReward),
      videoUrl: v.videoUrl,
      videoType: v.videoType,
      watched: watchedIds.has(v.id),
      canWatch: !watchedIds.has(v.id),
    }));
  }

  async claimVideoReward(userId: string, videoId: string, watchedSeconds: number) {
    const video = await this.prisma.platformVideo.findFirst({
      where: { id: videoId, isActive: true },
    });
    if (!video) throw new BadRequestException('Видео не найдено');

    if (watchedSeconds < video.durationSec * 0.85) {
      throw new BadRequestException('Досмотрите видео до конца');
    }

    const already = await this.prisma.videoWatch.findFirst({
      where: { userId, videoId },
    });
    if (already) throw new BadRequestException('Награда за это видео уже получена');

    const mult = await this.economyEvents.getActiveMultiplier();
    const reward = Math.floor(toNumber(video.baseReward) * mult);

    await this.prisma.$transaction(async (tx) => {
      await this.walletOps.credit(
        {
          userId,
          accountType: AccountType.MAIN,
          amount: reward,
          type: TransactionType.REWARD,
          description: `Просмотр: ${video.title}`,
        },
        tx,
      );
      await tx.videoWatch.create({
        data: { userId, videoId, reward },
      });
    });

    await this.questsService.trackProgress(userId, 'video_watch');
    await this.battlepassService.addXp(userId, 15);

    return { reward, videoTitle: video.title };
  }

  async getDailyTasks(userId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [loginToday, videosToday, transfersToday] = await Promise.all([
      this.prisma.activityLog.count({
        where: { userId, action: 'LOGIN', createdAt: { gte: todayStart } },
      }),
      this.prisma.videoWatch.count({ where: { userId, watchedAt: { gte: todayStart } } }),
      this.prisma.transaction.count({
        where: {
          userId,
          type: TransactionType.TRANSFER,
          amount: { lt: 0 },
          createdAt: { gte: todayStart },
        },
      }),
    ]);

    return [
      {
        id: 'daily-visit',
        title: 'Активный день',
        description: 'Войдите в игру сегодня',
        progress: loginToday > 0 ? 1 : 0,
        target: 1,
        reward: 15,
        completed: loginToday > 0,
      },
      {
        id: 'daily-videos',
        title: 'Обучение',
        description: 'Посмотрите 2 видео',
        progress: Math.min(videosToday, 2),
        target: 2,
        reward: 30,
        completed: videosToday >= 2,
      },
      {
        id: 'daily-social',
        title: 'Щедрость',
        description: 'Отправьте перевод другу',
        progress: transfersToday > 0 ? 1 : 0,
        target: 1,
        reward: 20,
        completed: transfersToday > 0,
      },
    ];
  }

  // --- Admin video CRUD ---

  async adminListVideos() {
    return this.prisma.platformVideo.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async adminCreateVideo(data: {
    slug: string;
    title: string;
    description: string;
    videoUrl: string;
    videoType?: string;
    durationSec: number;
    baseReward: number;
    sortOrder?: number;
  }) {
    return this.prisma.platformVideo.create({
      data: {
        slug: data.slug,
        title: data.title,
        description: data.description,
        videoUrl: data.videoUrl,
        videoType: data.videoType ?? (data.videoUrl.includes('youtube') ? 'youtube' : 'mp4'),
        durationSec: data.durationSec,
        baseReward: data.baseReward,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async adminUpdateVideo(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      videoUrl: string;
      videoType: string;
      durationSec: number;
      baseReward: number;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) {
    const video = await this.prisma.platformVideo.findUnique({ where: { id } });
    if (!video) throw new NotFoundException('Видео не найдено');
    return this.prisma.platformVideo.update({ where: { id }, data });
  }

  async adminDeleteVideo(id: string) {
    const video = await this.prisma.platformVideo.findUnique({ where: { id } });
    if (!video) throw new NotFoundException('Видео не найдено');
    await this.prisma.platformVideo.delete({ where: { id } });
    return { deleted: true };
  }
}
