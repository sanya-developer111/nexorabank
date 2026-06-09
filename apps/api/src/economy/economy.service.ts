import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EconomyEventType, Prisma } from '@prisma/client';
import { calculateInflation, BRAND } from '@nexora/shared';
import { toNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EconomyService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics() {
    let metrics = await this.prisma.currencyMetrics.findUnique({
      where: { id: 'nexium-global' },
    });

    if (!metrics) {
      metrics = await this.prisma.currencyMetrics.create({
        data: { id: 'nexium-global' },
      });
    }

    return {
      ...metrics,
      totalSupply: toNumber(metrics.totalSupply),
      circulating: toNumber(metrics.circulating),
      burned: toNumber(metrics.burned),
      inflationRate: toNumber(metrics.inflationRate),
      velocity: toNumber(metrics.velocity),
      rarityIndex: toNumber(metrics.rarityIndex),
      maxSupply: BRAND.currency.maxSupply,
    };
  }

  async getActiveEvents() {
    const events = await this.prisma.economyEvent.findMany({
      where: { isActive: true, endsAt: { gt: new Date() } },
      orderBy: { startsAt: 'desc' },
    });
    return events.map((e) => ({ ...e, multiplier: toNumber(e.multiplier) }));
  }

  async burnCurrency(amount: number, reason?: string) {
    const metrics = await this.getMetrics();

    await this.prisma.currencyMetrics.update({
      where: { id: 'nexium-global' },
      data: {
        burned: { increment: amount },
        circulating: { decrement: amount },
      },
    });

    await this.prisma.economyEvent.create({
      data: {
        type: EconomyEventType.BURN_WEEK,
        title: 'Currency Burn',
        description: reason ?? `Burned ${amount} NEX from circulation`,
        multiplier: 1,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        metadata: { amount },
      },
    });

    return { burned: amount, totalBurned: metrics.burned + amount };
  }

  @Cron('0 * * * *')
  async updateInflation() {
    const metrics = await this.prisma.currencyMetrics.findUnique({
      where: { id: 'nexium-global' },
    });
    if (!metrics) return;

    const totalSupply = toNumber(metrics.totalSupply);
    const burned = toNumber(metrics.burned);
    const velocity = toNumber(metrics.velocity);

    const inflationRate = calculateInflation(totalSupply, burned, velocity);
    const circulating = totalSupply - burned;

    const recentTxCount = await this.prisma.transaction.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        status: 'COMPLETED',
      },
    });

    const newVelocity = recentTxCount * 10;
    const rarityIndex = circulating / BRAND.currency.maxSupply;

    await this.prisma.currencyMetrics.update({
      where: { id: 'nexium-global' },
      data: {
        inflationRate: new Prisma.Decimal(inflationRate.toFixed(6)),
        circulating: new Prisma.Decimal(circulating.toFixed(4)),
        velocity: new Prisma.Decimal(newVelocity.toFixed(4)),
        rarityIndex: new Prisma.Decimal(rarityIndex.toFixed(4)),
      },
    });

    if (Math.abs(inflationRate) > 0.01) {
      const eventType = inflationRate > 0 ? EconomyEventType.INFLATION : EconomyEventType.DEFLATION;
      await this.prisma.economyEvent.create({
        data: {
          type: eventType,
          title: inflationRate > 0 ? 'Inflation Detected' : 'Deflation Detected',
          description: `Economy inflation rate updated to ${(inflationRate * 100).toFixed(2)}%`,
          multiplier: new Prisma.Decimal((1 + inflationRate).toFixed(4)),
          startsAt: new Date(),
          endsAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
    }
  }

  async recalculateCirculating() {
    const accounts = await this.prisma.account.aggregate({
      _sum: { balance: true },
    });
    const circulating = toNumber(accounts._sum.balance ?? 0);

    await this.prisma.currencyMetrics.update({
      where: { id: 'nexium-global' },
      data: { circulating: new Prisma.Decimal(circulating.toFixed(4)) },
    });

    return { circulating };
  }
}
