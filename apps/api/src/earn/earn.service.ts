import { BadRequestException, Injectable } from '@nestjs/common';
import { AccountType, TransactionType } from '@prisma/client';
import { WalletOperationsService } from '../common/services/wallet-operations.service';
import { toNumber } from '../common/utils/decimal.util';
import { BusinessService } from '../business/business.service';
import { ContractsService } from '../contracts/contracts.service';
import { GamesService } from '../games/games.service';
import { PrismaService } from '../prisma/prisma.service';

import { PremiumService } from '../premium/premium.service';

@Injectable()
export class EarnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletOps: WalletOperationsService,
    private readonly gamesService: GamesService,
    private readonly contractsService: ContractsService,
    private readonly businessService: BusinessService,
    private readonly premiumService: PremiumService,
  ) {}

  async getStreak(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastClaim = user.lastDailyClaim ? new Date(user.lastDailyClaim) : null;
    const canClaim = !lastClaim || lastClaim < today;
    const reward = Math.min(25 + user.loginStreak * 10, 500);

    return { loginStreak: user.loginStreak, canClaim, reward };
  }

  async claimStreak(userId: string) {
    const streak = await this.getStreak(userId);
    if (!streak.canClaim) throw new BadRequestException('Daily reward already claimed');

    await this.prisma.$transaction(async (tx) => {
      await this.walletOps.credit(
        {
          userId,
          accountType: AccountType.MAIN,
          amount: streak.reward,
          type: TransactionType.REWARD,
          description: `Login streak day ${streak.loginStreak}`,
        },
        tx,
      );
      await tx.user.update({
        where: { id: userId },
        data: { lastDailyClaim: new Date() },
      });
    });

    return { reward: streak.reward, loginStreak: streak.loginStreak };
  }

  async getWheelStatus(userId: string) {
    return this.gamesService.getWheelSpinsInfo(userId);
  }

  async getContracts() {
    const result = await this.contractsService.getOpen({ page: 1, limit: 50 });
    return result.items.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      reward: c.reward,
      status: c.status,
      poster: { username: c.poster.username },
    }));
  }

  async getBusinesses(userId: string) {
    const businesses = await this.businessService.getBusinesses(userId);
    const now = Date.now();
    return businesses.map((b) => {
      const lastCollect = b.lastCollect ?? b.createdAt;
      const hoursSince = (now - new Date(lastCollect).getTime()) / (1000 * 60 * 60);
      return {
        id: b.id,
        name: b.name,
        type: b.type,
        level: b.level,
        revenue: b.revenue,
        upkeep: b.upkeep,
        canCollect: hoursSince >= 1,
      };
    });
  }

  async collectBusiness(userId: string, id: string) {
    const result = await this.businessService.collectRevenue(userId, id);
    return { revenue: result.netRevenue };
  }

  async openCase(userId: string, caseType: string) {
    const result = await this.gamesService.openCase(userId, caseType);
    return { itemWon: result.item.name, rarity: result.rarity };
  }
}
