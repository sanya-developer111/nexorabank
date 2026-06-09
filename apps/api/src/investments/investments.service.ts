import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AccountType, Prisma, TransactionType } from '@prisma/client';
import { WalletOperationsService } from '../common/services/wallet-operations.service';
import { randomBetween } from '../common/utils/random.util';
import { toNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';
import { TradeDto } from './dto/trade.dto';
import { QuestsService } from '../quests/quests.service';
import { AchievementsService } from '../achievements/achievements.service';

@Injectable()
export class InvestmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletOps: WalletOperationsService,
    private readonly questsService: QuestsService,
    private readonly achievementsService: AchievementsService,
  ) {}

  async listAssets() {
    const assets = await this.prisma.asset.findMany({
      where: { isActive: true },
      orderBy: { symbol: 'asc' },
    });
    return assets.map((a) => ({
      ...a,
      price: toNumber(a.price),
      change24h: toNumber(a.change24h),
      volume24h: toNumber(a.volume24h),
      marketCap: toNumber(a.marketCap),
    }));
  }

  async getAsset(symbol: string) {
    const asset = await this.prisma.asset.findUnique({ where: { symbol } });
    if (!asset) throw new NotFoundException('Asset not found');
    return {
      ...asset,
      price: toNumber(asset.price),
      change24h: toNumber(asset.change24h),
      volume24h: toNumber(asset.volume24h),
      marketCap: toNumber(asset.marketCap),
    };
  }

  async getPriceHistory(assetIdOrSymbol: string, limit = 100) {
    const bySymbol = await this.prisma.asset.findUnique({ where: { symbol: assetIdOrSymbol } });
    const assetId = bySymbol?.id ?? assetIdOrSymbol;

    const history = await this.prisma.priceHistory.findMany({
      where: { assetId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    return history.map((h) => ({
      ...h,
      price: toNumber(h.price),
      volume: toNumber(h.volume),
    }));
  }

  async getPortfolio(userId: string) {
    const holdings = await this.prisma.portfolioHolding.findMany({
      where: { userId },
      include: { asset: true },
    });

    return holdings.map((h) => {
      const currentPrice = toNumber(h.asset.price);
      const quantity = toNumber(h.quantity);
      const avgPrice = toNumber(h.avgPrice);
      const value = currentPrice * quantity;
      const cost = avgPrice * quantity;
      return {
        assetId: h.assetId,
        symbol: h.asset.symbol,
        name: h.asset.name,
        quantity,
        avgPrice,
        currentPrice,
        value,
        pnl: value - cost,
        profitLoss: value - cost,
        profitLossPercent: cost > 0 ? ((value - cost) / cost) * 100 : 0,
        asset: {
          ...h.asset,
          price: currentPrice,
          change24h: toNumber(h.asset.change24h),
        },
      };
    });
  }

  async buy(userId: string, dto: TradeDto) {
    const asset = await this.prisma.asset.findUnique({ where: { id: dto.assetId } });
    if (!asset || !asset.isActive) throw new NotFoundException('Asset not found');

    const price = toNumber(asset.price);
    const totalCost = price * dto.quantity;

    return this.prisma.$transaction(async (tx) => {
      await this.walletOps.debit(
        {
          userId,
          accountType: AccountType.MAIN,
          amount: totalCost,
          type: TransactionType.INVESTMENT,
          description: `Buy ${dto.quantity} ${asset.symbol}`,
          metadata: { assetId: asset.id, quantity: dto.quantity, price },
        },
        tx,
      );

      const existing = await tx.portfolioHolding.findUnique({
        where: { userId_assetId: { userId, assetId: asset.id } },
      });

      if (existing) {
        const oldQty = toNumber(existing.quantity);
        const oldAvg = toNumber(existing.avgPrice);
        const newQty = oldQty + dto.quantity;
        const newAvg = (oldQty * oldAvg + totalCost) / newQty;

        await tx.portfolioHolding.update({
          where: { id: existing.id },
          data: {
            quantity: newQty,
            avgPrice: newAvg,
          },
        });
      } else {
        await tx.portfolioHolding.create({
          data: {
            userId,
            assetId: asset.id,
            quantity: dto.quantity,
            avgPrice: price,
          },
        });
      }

      await tx.asset.update({
        where: { id: asset.id },
        data: { volume24h: { increment: totalCost } },
      });

      return { symbol: asset.symbol, quantity: dto.quantity, totalCost, price };
    }).then(async (result) => {
      await this.questsService.trackProgress(userId, 'invest');
      await this.achievementsService.checkAndUnlock(userId, 'investor', true);
      return result;
    });
  }

  async sell(userId: string, dto: TradeDto) {
    const holding = await this.prisma.portfolioHolding.findUnique({
      where: { userId_assetId: { userId, assetId: dto.assetId } },
      include: { asset: true },
    });
    if (!holding) throw new BadRequestException('No holdings for this asset');

    const currentQty = toNumber(holding.quantity);
    if (currentQty < dto.quantity) {
      throw new BadRequestException('Insufficient quantity');
    }

    const price = toNumber(holding.asset.price);
    const totalProceeds = price * dto.quantity;

    return this.prisma.$transaction(async (tx) => {
      const newQty = currentQty - dto.quantity;
      if (newQty <= 0) {
        await tx.portfolioHolding.delete({ where: { id: holding.id } });
      } else {
        await tx.portfolioHolding.update({
          where: { id: holding.id },
          data: { quantity: newQty },
        });
      }

      await this.walletOps.credit(
        {
          userId,
          accountType: AccountType.MAIN,
          amount: totalProceeds,
          type: TransactionType.SALE,
          description: `Sell ${dto.quantity} ${holding.asset.symbol}`,
          metadata: { assetId: holding.assetId, quantity: dto.quantity, price },
        },
        tx,
      );

      return {
        symbol: holding.asset.symbol,
        quantity: dto.quantity,
        totalProceeds,
        price,
      };
    });
  }

  @Cron('*/30 * * * * *')
  async updatePrices() {
    const assets = await this.prisma.asset.findMany({ where: { isActive: true } });

    for (const asset of assets) {
      const currentPrice = toNumber(asset.price);
      const volatility = asset.type === 'CRYPTO' ? 0.05 : asset.type === 'INDEX' ? 0.01 : 0.03;
      const change = randomBetween(-volatility, volatility);
      const newPrice = Math.max(0.01, currentPrice * (1 + change));
      const change24h = ((newPrice - currentPrice) / currentPrice) * 100;

      await this.prisma.$transaction([
        this.prisma.asset.update({
          where: { id: asset.id },
          data: {
            price: new Prisma.Decimal(newPrice.toFixed(4)),
            change24h: new Prisma.Decimal(change24h.toFixed(4)),
            marketCap: new Prisma.Decimal((newPrice * 1000000).toFixed(4)),
          },
        }),
        this.prisma.priceHistory.create({
          data: {
            assetId: asset.id,
            price: new Prisma.Decimal(newPrice.toFixed(4)),
            volume: new Prisma.Decimal(randomBetween(100, 10000).toFixed(4)),
          },
        }),
      ]);
    }
  }
}
