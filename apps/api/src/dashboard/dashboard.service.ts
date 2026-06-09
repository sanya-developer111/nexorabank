import { Injectable } from '@nestjs/common';
import { toNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  async getStats(userId: string) {
    const balance = await this.walletService.getSummary(userId);

    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const recentActivity = transactions.map((t) => ({
      type: t.type,
      amount: toNumber(t.amount),
      createdAt: t.createdAt.toISOString(),
    }));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const historyTx = await this.prisma.transaction.findMany({
      where: { userId, createdAt: { gte: thirtyDaysAgo } },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap = new Map<string, number>();
    let running = balance.totalBalance;

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      dailyMap.set(key, running);
    }

    for (const tx of historyTx.reverse()) {
      const key = new Date(tx.createdAt).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
      });
      if (dailyMap.has(key)) {
        running -= toNumber(tx.amount);
        dailyMap.set(key, Math.max(0, running));
      }
    }

    const chartData = Array.from(dailyMap.entries()).map(([date, bal]) => ({
      date,
      balance: Math.round(bal * 100) / 100,
    }));

    return { balance, recentActivity, chartData };
  }
}
