import { Injectable } from '@nestjs/common';
import { toNumber } from '../common/utils/decimal.util';
import { tierFromUser } from '../premium/premium.cosmetics';
import { PrismaService } from '../prisma/prisma.service';

type LeaderboardType = 'wealth' | 'level' | 'investments';

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeaderboard(type: LeaderboardType = 'wealth', limit = 50) {
    const users = await this.prisma.user.findMany({
      where: { isBanned: false },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        avatarFrame: true,
        title: true,
        isPremium: true,
        premiumUntil: true,
        level: true,
        xp: true,
        rank: true,
        accounts: { select: { balance: true } },
        portfolio: { include: { asset: { select: { price: true } } } },
        achievements: { select: { id: true } },
      },
      take: 200,
    });

    const scored = users.map((u) => {
      const wealth = u.accounts.reduce((sum, a) => sum + toNumber(a.balance), 0);
      const investments = u.portfolio.reduce(
        (sum, h) => sum + toNumber(h.quantity) * toNumber(h.asset.price),
        0,
      );
      let value: number;
      if (type === 'level') value = u.level;
      else if (type === 'investments') value = investments;
      else value = wealth + investments;

      const premiumTier = tierFromUser(u);
      return {
        username: u.username,
        displayName: u.displayName,
        avatar: u.avatar,
        avatarFrame: premiumTier ? u.avatarFrame : null,
        title: u.title,
        premiumTier,
        level: u.level,
        value,
        rank_title: u.rank,
      };
    });

    scored.sort((a, b) => b.value - a.value);

    return scored.slice(0, limit).map((entry, i) => ({
      rank: i + 1,
      ...entry,
    }));
  }
}
