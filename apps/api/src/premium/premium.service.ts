import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { WalletOperationsService } from '../common/services/wallet-operations.service';
import { PrismaService } from '../prisma/prisma.service';
import { cosmeticsForTier, isPremiumTitle } from './premium.cosmetics';

export const PREMIUM_PLANS = [
  {
    id: 'starter',
    name: 'NEXORA Plus',
    price: 5000,
    durationDays: 30,
    benefits: [
      'Кэшбэк 5% (вместо 2%)',
      'Награды премиум-боевого пропуска',
      'Эксклюзивные призы на колесе',
      'Приоритетный вход в турниры',
      'Уникальный титул и рамка аватара',
    ],
  },
  {
    id: 'pro',
    name: 'NEXORA Pro',
    price: 15000,
    durationDays: 30,
    benefits: [
      'Все преимущества Plus',
      'Кэшбэк 7%',
      '+1 вращение колеса в день',
      'Скидка 10% в официальном магазине',
      'Бонус +25% к наградам за квесты',
    ],
  },
  {
    id: 'elite',
    name: 'NEXORA Elite',
    price: 50000,
    durationDays: 30,
    benefits: [
      'Все преимущества Pro',
      'Кэшбэк 10%',
      'Эксклюзивные предметы сезона',
      'Доступ к закрытым турнирам',
      'Персональный значок в чате',
    ],
  },
] as const;

export type PremiumTier = 'starter' | 'pro' | 'elite' | null;

@Injectable()
export class PremiumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletOps: WalletOperationsService,
  ) {}

  getPlans() {
    return PREMIUM_PLANS.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      benefits: [...p.benefits],
    }));
  }

  async syncExpiredPremium(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true, premiumUntil: true, title: true },
    });
    if (user?.isPremium && user.premiumUntil && user.premiumUntil <= new Date()) {
      await this.revokePremium(userId);
    }
  }

  async getActiveTier(userId: string): Promise<PremiumTier> {
    await this.syncExpiredPremium(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true, premiumUntil: true },
    });
    if (!user?.isPremium || !user.premiumUntil || user.premiumUntil <= new Date()) return null;

    const sub = await this.prisma.premiumSubscription.findFirst({
      where: { userId, isActive: true, endsAt: { gt: new Date() } },
      orderBy: { endsAt: 'desc' },
    });
    const plan = (sub?.plan ?? 'STARTER').toLowerCase();
    if (plan.includes('elite')) return 'elite';
    if (plan.includes('pro')) return 'pro';
    return 'starter';
  }

  getCashbackRate(tier: PremiumTier): number {
    if (tier === 'elite') return 0.1;
    if (tier === 'pro') return 0.07;
    if (tier === 'starter') return 0.05;
    return 0.02;
  }

  getWheelMaxSpins(tier: PremiumTier): number {
    if (tier === 'elite') return 5;
    if (tier === 'pro') return 4;
    return 3;
  }

  getQuestMultiplier(tier: PremiumTier): number {
    if (tier === 'elite') return 1.5;
    if (tier === 'pro') return 1.25;
    return 1;
  }

  getShopDiscount(tier: PremiumTier): number {
    if (tier === 'elite') return 0.15;
    if (tier === 'pro') return 0.1;
    return 0;
  }

  async getStatus(userId: string) {
    const tier = await this.getActiveTier(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true, premiumUntil: true, title: true, avatarFrame: true },
    });

    const isPremium = !!tier;

    if (tier && user && !user.avatarFrame) {
      const cosmetics = cosmeticsForTier(tier);
      await this.prisma.user.update({
        where: { id: userId },
        data: { title: cosmetics.title, avatarFrame: cosmetics.avatarFrame },
      });
    }

    return {
      isPremium,
      tier,
      title: user?.title ?? (tier ? cosmeticsForTier(tier).title : null),
      avatarFrame: user?.avatarFrame ?? (tier ? cosmeticsForTier(tier).avatarFrame : null),
      expiresAt: user?.premiumUntil?.toISOString(),
    };
  }

  private async applyPremiumPerks(
    userId: string,
    planId: string,
    endsAt: Date,
    tx: Prisma.TransactionClient,
  ) {
    const cosmetics = cosmeticsForTier(planId as PremiumTier);
    await tx.user.update({
      where: { id: userId },
      data: {
        isPremium: true,
        premiumUntil: endsAt,
        title: cosmetics.title,
        avatarFrame: cosmetics.avatarFrame,
      },
    });

    await tx.battlePassProgress.updateMany({
      where: { userId },
      data: { isPremium: true },
    });

    if (planId === 'elite') {
      await this.grantEliteSeasonItem(userId, tx);
    }
  }

  private async grantEliteSeasonItem(userId: string, tx: Prisma.TransactionClient) {
    const item = await tx.item.findFirst({ where: { slug: 'elite-season-crown' } });
    if (!item) return;

    const existing = await tx.inventoryItem.findFirst({
      where: { userId, itemId: item.id },
    });
    if (existing) return;

    await tx.inventoryItem.create({
      data: { userId, itemId: item.id, quantity: 1 },
    });
  }

  formatPublicUser(
    user: {
      username: string;
      displayName: string;
      avatar?: string | null;
      avatarFrame?: string | null;
      title?: string | null;
    },
    tier: PremiumTier,
  ) {
    return {
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar ?? undefined,
      avatarFrame: tier ? (user.avatarFrame ?? cosmeticsForTier(tier).avatarFrame) : undefined,
      title: user.title ?? undefined,
      premiumTier: tier,
    };
  }

  async subscribe(userId: string, planId = 'starter') {
    const plan = PREMIUM_PLANS.find((p) => p.id === planId);
    if (!plan) throw new BadRequestException('Неверный тариф');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Пользователь не найден');

    const tierRank: Record<string, number> = { starter: 1, pro: 2, elite: 3 };
    const currentTier = await this.getActiveTier(userId);
    const newRank = tierRank[planId] ?? 1;

    if (currentTier) {
      const currentRank = tierRank[currentTier] ?? 1;
      if (newRank < currentRank) {
        throw new BadRequestException('Нельзя купить тариф ниже текущего активного');
      }
    }

    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const lastSamePlan = await this.prisma.premiumSubscription.findFirst({
      where: { userId, plan: plan.id.toUpperCase(), startsAt: { gte: monthAgo } },
      orderBy: { startsAt: 'desc' },
    });
    if (lastSamePlan && (!currentTier || newRank <= (tierRank[currentTier] ?? 1))) {
      throw new BadRequestException(
        'Повторная покупка этого тарифа возможна только через 30 дней. Можно купить тариф выше.',
      );
    }

    const now = new Date();
    const currentEnd = user.premiumUntil && user.premiumUntil > now ? user.premiumUntil : now;
    const endsAt = new Date(currentEnd.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      await this.walletOps.debit(
        {
          userId,
          amount: plan.price,
          type: TransactionType.PREMIUM,
          description: `Подписка ${plan.name}`,
        },
        tx,
      );

      await tx.premiumSubscription.create({
        data: { userId, plan: plan.id.toUpperCase(), endsAt, isActive: true },
      });

      await this.applyPremiumPerks(userId, plan.id, endsAt, tx);
    });

    return { expiresAt: endsAt.toISOString(), cost: plan.price, plan: plan.name };
  }

  /** Admin grant — без списания NEX */
  async grantPremium(
    userId: string,
    planId = 'starter',
    durationDays?: number,
    grantedBy?: string,
  ) {
    const plan = PREMIUM_PLANS.find((p) => p.id === planId);
    if (!plan) throw new BadRequestException('Invalid plan');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const days = durationDays ?? plan.durationDays;
    const now = new Date();
    const currentEnd = user.premiumUntil && user.premiumUntil > now ? user.premiumUntil : now;
    const endsAt = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      await tx.premiumSubscription.create({
        data: { userId, plan: plan.id.toUpperCase(), endsAt, isActive: true },
      });

      await this.applyPremiumPerks(userId, plan.id, endsAt, tx);

      if (grantedBy) {
        await tx.activityLog.create({
          data: {
            userId: grantedBy,
            action: 'ADMIN_GRANT_PREMIUM',
            entity: 'user',
            entityId: userId,
            metadata: {
              plan: plan.id,
              days,
              targetUsername: user.username,
              expiresAt: endsAt.toISOString(),
            },
          },
        });
      }
    });

    return {
      username: user.username,
      plan: plan.name,
      planId: plan.id,
      expiresAt: endsAt.toISOString(),
      durationDays: days,
      granted: true,
    };
  }

  async revokePremium(userId: string, revokedBy?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.premiumSubscription.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });

      const clearCosmetics = isPremiumTitle(user.title);
      await tx.user.update({
        where: { id: userId },
        data: {
          isPremium: false,
          premiumUntil: null,
          ...(clearCosmetics ? { title: null, avatarFrame: null } : {}),
        },
      });

      await tx.battlePassProgress.updateMany({
        where: { userId },
        data: { isPremium: false },
      });

      if (revokedBy) {
        await tx.activityLog.create({
          data: {
            userId: revokedBy,
            action: 'ADMIN_REVOKE_PREMIUM',
            entity: 'user',
            entityId: userId,
            metadata: { targetUsername: user.username },
          },
        });
      }
    });

    return { username: user.username, revoked: true };
  }
}
