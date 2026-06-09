import { Injectable } from '@nestjs/common';
import { toNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserAnalytics(userId: string) {
    const [
      user,
      transactionCount,
      totalSpent,
      totalEarned,
      achievementCount,
      questCompleted,
      portfolioValue,
      businesses,
    ] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.transaction.count({ where: { userId } }),
      this.prisma.transaction.aggregate({
        where: { userId, amount: { lt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.userAchievement.count({ where: { userId } }),
      this.prisma.userQuest.count({ where: { userId, completed: true } }),
      this.getPortfolioValue(userId),
      this.prisma.business.count({ where: { ownerId: userId } }),
    ]);

    const recentActivity = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      profile: {
        level: user?.level,
        xp: user?.xp,
        rank: user?.rank,
        loginStreak: user?.loginStreak,
        isPremium: user?.isPremium,
      },
      financial: {
        transactionCount,
        totalSpent: Math.abs(toNumber(totalSpent._sum.amount ?? 0)),
        totalEarned: toNumber(totalEarned._sum.amount ?? 0),
        portfolioValue,
      },
      engagement: {
        achievements: achievementCount,
        questsCompleted: questCompleted,
        businesses,
        referrals: await this.prisma.user.count({ where: { referredById: userId } }),
      },
      recentActivity,
    };
  }

  async getPlatformAnalytics() {
    const [
      userCount,
      activeUsers,
      totalTransactions,
      premiumUsers,
      totalVolume,
      metrics,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { lastLoginAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      this.prisma.transaction.count(),
      this.prisma.user.count({ where: { isPremium: true } }),
      this.prisma.transaction.aggregate({ _sum: { amount: true } }),
      this.prisma.currencyMetrics.findUnique({ where: { id: 'nexium-global' } }),
    ]);

    const topUsers = await this.prisma.user.findMany({
      orderBy: { level: 'desc' },
      take: 10,
      select: { username: true, level: true, xp: true, rank: true },
    });

    return {
      users: { total: userCount, activeWeekly: activeUsers, premium: premiumUsers },
      transactions: { total: totalTransactions, volume: toNumber(totalVolume._sum.amount ?? 0) },
      economy: metrics
        ? {
            circulating: toNumber(metrics.circulating),
            burned: toNumber(metrics.burned),
            inflationRate: toNumber(metrics.inflationRate),
          }
        : null,
      topUsers,
    };
  }

  private async getPortfolioValue(userId: string) {
    const holdings = await this.prisma.portfolioHolding.findMany({
      where: { userId },
      include: { asset: true },
    });
    return holdings.reduce(
      (sum, h) => sum + toNumber(h.quantity) * toNumber(h.asset.price),
      0,
    );
  }
}
