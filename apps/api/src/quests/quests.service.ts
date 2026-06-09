import { BadRequestException, Injectable } from '@nestjs/common';
import { AccountType, QuestPeriod, TransactionType } from '@prisma/client';
import { WalletOperationsService } from '../common/services/wallet-operations.service';
import { toNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';
import { PremiumService } from '../premium/premium.service';
import { syncUserLevel } from '../common/utils/level.util';

@Injectable()
export class QuestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletOps: WalletOperationsService,
    private readonly premiumService: PremiumService,
  ) {}

  async getQuests(userId: string, period?: QuestPeriod) {
    const quests = await this.prisma.quest.findMany({
      where: { isActive: true, ...(period ? { period } : {}) },
      include: {
        progress: { where: { userId } },
      },
    });

    return quests.map((q) => {
      const userProgress = q.progress[0];
      return {
        id: q.id,
        title: q.title,
        description: q.description,
        progress: userProgress?.progress ?? 0,
        target: q.target,
        completed: userProgress?.completed ?? false,
        claimed: !!userProgress?.claimedAt,
        nexReward: toNumber(q.nexReward),
        xpReward: q.xpReward,
      };
    });
  }

  async trackProgress(userId: string, action: string, amount = 1) {
    const quests = await this.prisma.quest.findMany({
      where: { isActive: true, action },
      include: { progress: { where: { userId } } },
    });

    for (const quest of quests) {
      const existing = quest.progress[0];
      if (existing?.completed) continue;

      const newProgress = Math.min((existing?.progress ?? 0) + amount, quest.target);
      const completed = newProgress >= quest.target;

      await this.prisma.userQuest.upsert({
        where: { userId_questId: { userId, questId: quest.id } },
        create: { userId, questId: quest.id, progress: newProgress, completed },
        update: { progress: newProgress, completed },
      });
    }
  }

  async claimReward(userId: string, questId: string) {
    const userQuest = await this.prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
      include: { quest: true },
    });

    if (!userQuest) throw new BadRequestException('Quest not started');
    if (!userQuest.completed) throw new BadRequestException('Quest not completed');
    if (userQuest.claimedAt) throw new BadRequestException('Reward already claimed');

    const nexReward = toNumber(userQuest.quest.nexReward);
    const xpReward = userQuest.quest.xpReward;
    const tier = await this.premiumService.getActiveTier(userId);
    const mult = this.premiumService.getQuestMultiplier(tier);
    const finalNex = Math.floor(nexReward * mult);
    const finalXp = Math.floor(xpReward * mult);

    await this.prisma.$transaction(async (tx) => {
      await tx.userQuest.update({
        where: { id: userQuest.id },
        data: { claimedAt: new Date() },
      });

      if (finalNex > 0) {
        await this.walletOps.credit(
          {
            userId,
            accountType: AccountType.MAIN,
            amount: finalNex,
            type: TransactionType.QUEST,
            description: `Quest reward: ${userQuest.quest.title}`,
          },
          tx,
        );
      }

      if (finalXp > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { xp: { increment: finalXp } },
        });
      }
    });

    await syncUserLevel(this.prisma, userId);

    return {
      nexReward: finalNex,
      xpReward: finalXp,
      message: 'Reward claimed',
    };
  }

  async resetDailyQuests() {
    const dailyQuests = await this.prisma.quest.findMany({
      where: { period: QuestPeriod.DAILY, isActive: true },
    });
    const questIds = dailyQuests.map((q) => q.id);

    await this.prisma.userQuest.updateMany({
      where: { questId: { in: questIds } },
      data: { progress: 0, completed: false, claimedAt: null, resetAt: new Date() },
    });
  }
}
