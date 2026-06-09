import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountType, BusinessType, TransactionType } from '@prisma/client';
import { WalletOperationsService } from '../common/services/wallet-operations.service';
import { toNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';

const BUSINESS_COSTS: Record<BusinessType, number> = {
  CAFE: 2500,
  TECH: 8000,
  MINING: 25000,
  TRADING: 15000,
  REAL_ESTATE: 75000,
  ENTERTAINMENT: 5000,
};

const REVENUE_RATES: Record<BusinessType, number> = {
  CAFE: 15,
  TECH: 25,
  MINING: 40,
  TRADING: 35,
  REAL_ESTATE: 50,
  ENTERTAINMENT: 20,
};

@Injectable()
export class BusinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletOps: WalletOperationsService,
  ) {}

  async getBusinesses(userId: string) {
    const businesses = await this.prisma.business.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return businesses.map((b) => ({
      ...b,
      revenue: toNumber(b.revenue),
      upkeep: toNumber(b.upkeep),
    }));
  }

  async create(userId: string, dto: CreateBusinessDto) {
    const cost = BUSINESS_COSTS[dto.type];

    return this.prisma.$transaction(async (tx) => {
      await this.walletOps.debit(
        {
          userId,
          accountType: AccountType.MAIN,
          amount: cost,
          type: TransactionType.BUSINESS,
          description: `Created business: ${dto.name}`,
        },
        tx,
      );

      return tx.business.create({
        data: {
          ownerId: userId,
          name: dto.name,
          type: dto.type,
          upkeep: BUSINESS_COSTS[dto.type] * 0.02,
        },
      });
    });
  }

  async collectRevenue(userId: string, businessId: string) {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, ownerId: userId },
    });
    if (!business) throw new NotFoundException('Business not found');

    const now = new Date();
    const lastCollect = business.lastCollect ?? business.createdAt;
    const hoursSince = (now.getTime() - lastCollect.getTime()) / (1000 * 60 * 60);

    if (hoursSince < 1) {
      throw new BadRequestException('Revenue can be collected once per hour');
    }

    const hours = Math.min(Math.floor(hoursSince), 24);
    const baseRate = REVENUE_RATES[business.type];
    const levelMultiplier = 1 + (business.level - 1) * 0.1;
    const grossRevenue = baseRate * hours * levelMultiplier;
    const upkeep = toNumber(business.upkeep) * hours;
    const netRevenue = Math.max(0, grossRevenue - upkeep);

    await this.prisma.$transaction(async (tx) => {
      await tx.business.update({
        where: { id: businessId },
        data: {
          lastCollect: now,
          revenue: { increment: netRevenue },
        },
      });

      if (netRevenue > 0) {
        await this.walletOps.credit(
          {
            userId,
            accountType: AccountType.BUSINESS,
            amount: netRevenue,
            type: TransactionType.BUSINESS,
            description: `Revenue from ${business.name}`,
          },
          tx,
        );
      }
    });

    return { netRevenue, hours, business: business.name };
  }

  async upgrade(userId: string, businessId: string) {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, ownerId: userId },
    });
    if (!business) throw new NotFoundException('Business not found');

    const upgradeCost = business.level * business.level * 500;

    return this.prisma.$transaction(async (tx) => {
      await this.walletOps.debit(
        {
          userId,
          accountType: AccountType.MAIN,
          amount: upgradeCost,
          type: TransactionType.BUSINESS,
          description: `Upgrade ${business.name} to level ${business.level + 1}`,
        },
        tx,
      );

      return tx.business.update({
        where: { id: businessId },
        data: { level: { increment: 1 } },
      });
    });
  }
}
