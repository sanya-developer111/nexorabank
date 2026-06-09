import { BadRequestException, Injectable } from '@nestjs/common';
import { AccountType, TransactionType } from '@prisma/client';
import { WalletOperationsService } from '../common/services/wallet-operations.service';
import { toNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BattlepassService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletOps: WalletOperationsService,
  ) {}

  async getProgress(userId: string) {
    const season = await this.prisma.season.findFirst({ where: { isActive: true } });
    if (!season) return { message: 'No active season' };

    const battlePass = await this.prisma.battlePass.findUnique({
      where: { seasonId: season.id },
      include: { tiers: { orderBy: { tier: 'asc' } } },
    });
    if (!battlePass) return { message: 'No battle pass for season' };

    let progress = await this.prisma.battlePassProgress.findUnique({
      where: { userId },
    });

    if (!progress) {
      progress = await this.prisma.battlePassProgress.create({
        data: { userId, battlePassId: battlePass.id, claimedTiers: [] },
      });
    }

    const claimedTiers = (progress.claimedTiers as number[]) ?? [];

    return {
      season,
      battlePass: { id: battlePass.id, maxTier: battlePass.maxTier },
      progress: {
        currentTier: progress.currentTier,
        currentXp: progress.currentXp,
        isPremium: progress.isPremium,
        claimedTiers,
      },
      tiers: battlePass.tiers.map((t) => ({
        ...t,
        claimed: claimedTiers.includes(t.tier),
        claimable: progress!.currentTier >= t.tier && !claimedTiers.includes(t.tier),
      })),
    };
  }

  async addXp(userId: string, amount: number) {
    const progress = await this.prisma.battlePassProgress.findUnique({
      where: { userId },
      include: { battlePass: { include: { tiers: { orderBy: { tier: 'asc' } } } } },
    });
    if (!progress) return;

    let newXp = progress.currentXp + amount;
    let newTier = progress.currentTier;

    for (const tier of progress.battlePass.tiers) {
      if (newXp >= tier.xpRequired && tier.tier > newTier) {
        newTier = tier.tier;
      }
    }

    await this.prisma.battlePassProgress.update({
      where: { userId },
      data: { currentXp: newXp, currentTier: newTier },
    });
  }

  async claimTier(userId: string, tierNumber: number) {
    const progress = await this.prisma.battlePassProgress.findUnique({
      where: { userId },
      include: {
        battlePass: {
          include: { tiers: true },
        },
      },
    });
    if (!progress) throw new BadRequestException('No battle pass progress');

    const tier = progress.battlePass.tiers.find((t) => t.tier === tierNumber);
    if (!tier) throw new BadRequestException('Tier not found');
    if (progress.currentTier < tierNumber) {
      throw new BadRequestException('Tier not unlocked');
    }

    const claimedTiers = (progress.claimedTiers as number[]) ?? [];
    if (claimedTiers.includes(tierNumber)) {
      throw new BadRequestException('Tier already claimed');
    }

    const reward = progress.isPremium && tier.premiumReward
      ? (tier.premiumReward as { nex?: number; xp?: number })
      : (tier.freeReward as { nex?: number; xp?: number });

    await this.prisma.$transaction(async (tx) => {
      if (reward?.nex) {
        await this.walletOps.credit(
          {
            userId,
            accountType: AccountType.MAIN,
            amount: reward.nex,
            type: TransactionType.REWARD,
            description: `Battle pass tier ${tierNumber}`,
          },
          tx,
        );
      }
      if (reward?.xp) {
        await tx.user.update({
          where: { id: userId },
          data: { xp: { increment: reward.xp } },
        });
      }

      await tx.battlePassProgress.update({
        where: { userId },
        data: { claimedTiers: [...claimedTiers, tierNumber] },
      });
    });

    return { tier: tierNumber, reward };
  }
}
