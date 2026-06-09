import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  AssetType,
  ContractStatus,
  ItemRarity,
  QuestPeriod,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.ensureEssentials();
      const users = await this.prisma.user.findMany({ select: { id: true } });
      for (const u of users) {
        const { syncUserLevel } = await import('../common/utils/level.util');
        await syncUserLevel(this.prisma, u.id);
      }
      this.logger.log('Game data ready');
    } catch (err) {
      this.logger.warn(`Bootstrap skipped: ${err}`);
    }
  }

  private async ensureUtilityItems() {
    const utilityItems = [
      { slug: 'wheel-charm', name: 'Талисман колеса', description: '+1 дополнительное вращение колеса', rarity: ItemRarity.RARE, category: 'utility', basePrice: 450, effects: { extraWheelSpin: 1 } },
      { slug: 'xp-boost-1h', name: 'Ускоритель XP', description: '+50% XP на 1 час активности', rarity: ItemRarity.UNCOMMON, category: 'boost', basePrice: 300, effects: { xpBoost: 1.5, durationHours: 1 } },
      { slug: 'nex-multiplier', name: 'Множитель NEX', description: '+10% к наградам за задания на 24ч', rarity: ItemRarity.EPIC, category: 'boost', basePrice: 1200, effects: { rewardBoost: 1.1, durationHours: 24 } },
      { slug: 'lucky-coin', name: 'Счастливая монета', description: '+5% шанс выигрыша в мини-играх (1 игру)', rarity: ItemRarity.RARE, category: 'utility', basePrice: 800, effects: { luckyGame: true } },
      { slug: 'cashback-charm', name: 'Кулон кэшбэка', description: '+1% к кэшбэку на 7 дней (только с премиумом)', rarity: ItemRarity.EPIC, category: 'boost', basePrice: 2500, effects: { cashbackBonus: 0.01, durationDays: 7 } },
    ];
    for (const item of utilityItems) {
      await this.prisma.item.upsert({
        where: { slug: item.slug },
        create: item,
        update: { name: item.name, description: item.description, basePrice: item.basePrice, effects: item.effects as object },
      });
    }
  }

  private async ensureBattlePassTiers() {
    const season = await this.prisma.season.findFirst({ where: { isActive: true } });
    if (!season?.id) return;
    const bp = await this.prisma.battlePass.findUnique({ where: { seasonId: season.id } });
    if (!bp) return;

    const existing = await this.prisma.battlePassTier.count({ where: { battlePassId: bp.id } });
    if (existing >= 10) return;

    const tierDefs = [
      { tier: 1, xpRequired: 100, freeReward: { nex: 25 }, premiumReward: { nex: 50 } },
      { tier: 5, xpRequired: 500, freeReward: { nex: 50 }, premiumReward: { nex: 100 } },
      { tier: 10, xpRequired: 1000, freeReward: { nex: 100 }, premiumReward: { nex: 200 } },
      { tier: 15, xpRequired: 1500, freeReward: { nex: 75 }, premiumReward: { nex: 150 } },
      { tier: 25, xpRequired: 2500, freeReward: { nex: 250, xp: 50 }, premiumReward: { nex: 500, xp: 100 } },
      { tier: 50, xpRequired: 5000, freeReward: { nex: 1000, xp: 200 }, premiumReward: { nex: 2000, xp: 500 } },
    ];
    for (const t of tierDefs) {
      await this.prisma.battlePassTier.upsert({
        where: { battlePassId_tier: { battlePassId: bp.id, tier: t.tier } },
        create: { battlePassId: bp.id, ...t, isPremium: false },
        update: { xpRequired: t.xpRequired, freeReward: t.freeReward, premiumReward: t.premiumReward },
      });
    }
  }

  private async ensureVideos() {
    const count = await this.prisma.platformVideo.count();
    if (count > 0) return;

    await this.prisma.platformVideo.createMany({
      data: [
        {
          slug: 'welcome-nexora',
          title: 'Добро пожаловать в NEXORA',
          description: 'Краткий обзор возможностей платформы',
          videoUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
          videoType: 'youtube',
          durationSec: 19,
          baseReward: 50,
          sortOrder: 1,
        },
        {
          slug: 'earn-guide',
          title: 'Как зарабатывать без вложений',
          description: 'Задания, видео и ежедневные активности',
          videoUrl: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
          videoType: 'youtube',
          durationSec: 30,
          baseReward: 75,
          sortOrder: 2,
        },
      ],
    });
  }

  private async ensureTournaments() {
    const count = await this.prisma.tournament.count({ where: { isActive: true } });
    if (count >= 2) return;

    const now = new Date();
    const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    await this.prisma.tournament.createMany({
      data: [
        {
          name: 'Гонка инвесторов',
          description: 'Условие победы: наберите максимальный счёт (score) — покупайте активы, выполняйте задания, крутите колесо. Топ-10 делят призовой фонд.',
          prizePool: 50000,
          entryFee: 100,
          maxPlayers: 100,
          startsAt: now,
          endsAt: week,
          isActive: true,
          premiumOnly: false,
        },
        {
          name: 'Elite Championship',
          description: 'Только для NEXORA Elite. Условие: максимальный счёт за 2 недели. Автовыплата призов по окончании.',
          prizePool: 100000,
          entryFee: 500,
          maxPlayers: 30,
          startsAt: now,
          endsAt: twoWeeks,
          isActive: true,
          premiumOnly: true,
        },
      ],
      skipDuplicates: true,
    });
  }

  private async ensureEssentials() {
    const questCount = await this.prisma.quest.count();
    if (questCount === 0) {
      const quests = [
        { slug: 'daily-login', title: 'Ежедневный вход', description: 'Войдите в NEXORA', period: QuestPeriod.DAILY, target: 1, action: 'login', nexReward: 25, xpReward: 10 },
        { slug: 'daily-transfer', title: 'Перевод', description: 'Отправьте NEX другому игроку', period: QuestPeriod.DAILY, target: 1, action: 'transfer', nexReward: 50, xpReward: 15 },
        { slug: 'daily-wheel', title: 'Колесо фортуны', description: 'Крутите колесо', period: QuestPeriod.DAILY, target: 1, action: 'wheel_spin', nexReward: 30, xpReward: 10 },
        { slug: 'weekly-invest', title: 'Инвестор', description: 'Купите любой актив', period: QuestPeriod.WEEKLY, target: 1, action: 'invest', nexReward: 200, xpReward: 50 },
        { slug: 'daily-minigame', title: 'Азарт', description: 'Сыграйте в мини-игру', period: QuestPeriod.DAILY, target: 1, action: 'minigame', nexReward: 40, xpReward: 15 },
      ];
      for (const q of quests) {
        await this.prisma.quest.create({ data: q });
      }
    }

    const itemCount = await this.prisma.item.count({ where: { category: 'cosmetic' } });
    if (itemCount === 0) {
      const items = [
        { slug: 'bronze-badge', name: 'Бронзовый значок', description: 'Косметический значок новичка', rarity: ItemRarity.COMMON, category: 'cosmetic', basePrice: 50 },
        { slug: 'silver-badge', name: 'Серебряный значок', description: 'Значок опытного игрока', rarity: ItemRarity.UNCOMMON, category: 'cosmetic', basePrice: 150 },
        { slug: 'gold-badge', name: 'Золотой значок', description: 'Редкий золотой значок', rarity: ItemRarity.RARE, category: 'cosmetic', basePrice: 500 },
        { slug: 'plasma-sword', name: 'Плазменный меч', description: 'Эпический предмет коллекции', rarity: ItemRarity.EPIC, category: 'cosmetic', basePrice: 1200 },
        { slug: 'void-crown', name: 'Корона пустоты', description: 'Легендарная корона', rarity: ItemRarity.LEGENDARY, category: 'cosmetic', basePrice: 5000 },
        { slug: 'case-common', name: 'Осколок', rarity: ItemRarity.COMMON, category: 'case_reward', basePrice: 10 },
        { slug: 'case-rare', name: 'Кристалл', rarity: ItemRarity.RARE, category: 'case_reward', basePrice: 75 },
        { slug: 'case-legendary', name: 'Артефакт', rarity: ItemRarity.LEGENDARY, category: 'case_reward', basePrice: 1000 },
      ];
      for (const item of items) {
        await this.prisma.item.create({ data: item });
      }
    }

    const assetCount = await this.prisma.asset.count();
    if (assetCount === 0) {
      const assets = [
        { symbol: 'NEXO', name: 'Nexora Corp', type: AssetType.NEXORA_ASSET, price: 150 },
        { symbol: 'NXC', name: 'Nexium Coin', type: AssetType.CRYPTO, price: 42.75 },
        { symbol: 'TECH', name: 'TechNova Inc', type: AssetType.STOCK, price: 88.2 },
        { symbol: 'BYTE', name: 'ByteChain', type: AssetType.CRYPTO, price: 0.85 },
      ];
      for (const a of assets) {
        await this.prisma.asset.create({
          data: { ...a, change24h: 2.5, volume24h: 50000, marketCap: a.price * 1e6, description: `${a.name} на бирже NEXORA` },
        });
      }
    }

    await this.prisma.chatRoom.upsert({
      where: { slug: 'global' },
      update: {},
      create: { name: 'Global Chat', slug: 'global', isGlobal: true },
    });

    const achievementCount = await this.prisma.achievement.count();
    if (achievementCount === 0) {
      const achievements = [
        { slug: 'first-steps', name: 'Первые шаги', description: 'Создайте аккаунт NEXORA', icon: '👣', category: 'onboarding', nexReward: 50, xpReward: 25 },
        { slug: 'first-transfer', name: 'Денежный перевод', description: 'Выполните первый перевод', icon: '💸', category: 'wallet', nexReward: 100, xpReward: 50 },
        { slug: 'investor', name: 'Инвестор', description: 'Купите первый актив', icon: '📈', category: 'investments', nexReward: 150, xpReward: 75 },
        { slug: 'wheel-master', name: 'Мастер колеса', description: 'Крутите колесо 3 раза', icon: '🎡', category: 'games', nexReward: 200, xpReward: 100 },
        { slug: 'gambler', name: 'Игрок', description: 'Сыграйте 10 мини-игр', icon: '🎰', category: 'games', nexReward: 300, xpReward: 150 },
      ];
      for (const a of achievements) {
        await this.prisma.achievement.create({ data: a });
      }
    }

    const season = await this.prisma.season.findFirst({ where: { isActive: true } });
    if (!season) {
      const endsAt = new Date();
      endsAt.setMonth(endsAt.getMonth() + 3);
      const s = await this.prisma.season.create({
        data: { name: 'Сезон Genesis', number: 1, description: 'Первый сезон NEXORA', startsAt: new Date(), endsAt, isActive: true, theme: 'cyber-finance' },
      });
      const bp = await this.prisma.battlePass.create({ data: { seasonId: s.id, maxTier: 50 } });
      for (const t of [
        { tier: 1, xpRequired: 100, freeReward: { nex: 25 }, premiumReward: { nex: 50 } },
        { tier: 5, xpRequired: 500, freeReward: { nex: 50 }, premiumReward: { nex: 100 } },
        { tier: 10, xpRequired: 1000, freeReward: { nex: 100 }, premiumReward: { nex: 200 } },
      ]) {
        await this.prisma.battlePassTier.create({ data: { battlePassId: bp.id, ...t, isPremium: false } });
      }
    }

    if ((await this.prisma.clan.count()) === 0) {
      await this.prisma.clan.createMany({
        data: [
          { name: 'Стражи Nexora', tag: 'NEX', description: 'Элитные трейдеры', level: 5, treasury: 25000 },
          { name: 'Торговые мастера', tag: 'TRD', description: 'Команда рынка', level: 3, treasury: 12000 },
        ],
      });
    }

    if ((await this.prisma.corporation.count()) === 0) {
      await this.prisma.corporation.createMany({
        data: [
          { name: 'Nexora Holdings', ticker: 'NEXO', description: 'Флагманская корпорация', valuation: 500000, revenue: 50000 },
          { name: 'Quantum Matrix', ticker: 'QTMX', description: 'Технологии будущего', valuation: 250000, revenue: 30000 },
        ],
      });
    }

    await this.prisma.achievement.upsert({
      where: { slug: 'gambler' },
      create: {
        slug: 'gambler',
        name: 'Игрок',
        description: 'Сыграйте 10 мини-игр',
        icon: '🎰',
        category: 'games',
        nexReward: 300,
        xpReward: 150,
      },
      update: {},
    });

    await this.prisma.item.upsert({
      where: { slug: 'elite-season-crown' },
      create: {
        slug: 'elite-season-crown',
        name: 'Корона Elite',
        description: 'Эксклюзивный предмет сезона для NEXORA Elite',
        rarity: ItemRarity.LEGENDARY,
        category: 'premium',
        basePrice: 0,
        isTradeable: false,
      },
      update: {},
    });

    await this.prisma.item.upsert({
      where: { slug: 'premium-wheel-shard' },
      create: {
        slug: 'premium-wheel-shard',
        name: 'Элитный осколок',
        description: 'Редкий приз премиум-колеса',
        rarity: ItemRarity.EPIC,
        category: 'premium',
        basePrice: 0,
        isTradeable: true,
      },
      update: {},
    });

    const eliteTournament = await this.prisma.tournament.findFirst({
      where: { name: 'Elite Championship' },
    });
    if (!eliteTournament) {
      const startsAt = new Date();
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + 14);
      await this.prisma.tournament.create({
        data: {
          name: 'Elite Championship',
          description: 'Закрытый турнир только для NEXORA Elite',
          prizePool: 100000,
          entryFee: 500,
          maxPlayers: 30,
          startsAt,
          endsAt,
          isActive: true,
          premiumOnly: true,
        },
      });
    }

    await this.prisma.quest.upsert({
      where: { slug: 'daily-minigame' },
      create: {
        slug: 'daily-minigame',
        title: 'Азарт',
        description: 'Сыграйте в мини-игру',
        period: QuestPeriod.DAILY,
        target: 1,
        action: 'minigame',
        nexReward: 40,
        xpReward: 15,
      },
      update: { isActive: true },
    });

    await this.ensureUtilityItems();
    await this.ensureBattlePassTiers();
    await this.ensureVideos();
    await this.ensureTournaments();

    const admin = await this.prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (admin && (await this.prisma.contract.count()) === 0) {
      await this.prisma.contract.createMany({
        data: [
          { posterId: admin.id, title: 'Перевод 100 NEX', description: 'Отправьте 100 NEX на эскроу-счёт', reward: 150, status: ContractStatus.OPEN },
          { posterId: admin.id, title: 'Исследование рынка', description: 'Проанализируйте топ-5 активов', reward: 300, status: ContractStatus.OPEN },
        ],
      });
    }
  }
}
