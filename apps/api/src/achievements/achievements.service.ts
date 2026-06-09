import { BadRequestException, Injectable } from '@nestjs/common';
import { AccountType, TransactionType } from '@prisma/client';
import { WalletOperationsService } from '../common/services/wallet-operations.service';
import { syncUserLevel } from '../common/utils/level.util';
import { toNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AchievementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletOps: WalletOperationsService,
  ) {}

  async list(userId: string) {
    const [all, unlocked] = await Promise.all([
      this.prisma.achievement.findMany({ orderBy: { category: 'asc' } }),
      this.prisma.userAchievement.findMany({
        where: { userId },
        select: { achievementId: true, unlockedAt: true },
      }),
    ]);

    const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]));

    return all.map((a) => ({
      ...a,
      nexReward: toNumber(a.nexReward),
      unlocked: unlockedMap.has(a.id),
      unlockedAt: unlockedMap.get(a.id) ?? null,
      hidden: a.isSecret && !unlockedMap.has(a.id),
    })).map((a) => (a.hidden ? { ...a, name: '???', description: 'Secret achievement' } : a));
  }

  async getUnlocked(userId: string) {
    return this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    });
  }

  async unlock(userId: string, slug: string) {
    const achievement = await this.prisma.achievement.findUnique({ where: { slug } });
    if (!achievement) throw new BadRequestException('Achievement not found');

    const existing = await this.prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
    });
    if (existing) throw new BadRequestException('Achievement already unlocked');

    const nexReward = toNumber(achievement.nexReward);

    await this.prisma.$transaction(async (tx) => {
      await tx.userAchievement.create({
        data: { userId, achievementId: achievement.id },
      });

      if (nexReward > 0) {
        await this.walletOps.credit(
          {
            userId,
            accountType: AccountType.MAIN,
            amount: nexReward,
            type: TransactionType.REWARD,
            description: `Achievement: ${achievement.name}`,
          },
          tx,
        );
      }

      if (achievement.xpReward > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { xp: { increment: achievement.xpReward } },
        });
      }
    });

    await syncUserLevel(this.prisma, userId);

    return { achievement, message: 'Achievement unlocked' };
  }

  async checkAndUnlock(userId: string, slug: string, condition: boolean) {
    if (!condition) return null;
    try {
      return await this.unlock(userId, slug);
    } catch {
      return null;
    }
  }
}
