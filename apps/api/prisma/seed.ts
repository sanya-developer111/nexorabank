import {
  PrismaClient,
  AccountType,
  AssetType,
  ContractStatus,
  ItemRarity,
  QuestPeriod,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding NEXORA database...');

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@nexora.io';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'NexoraAdmin2026!';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: UserRole.SUPER_ADMIN },
    create: {
      email: adminEmail,
      username: 'nexora_admin',
      passwordHash,
      displayName: 'NEXORA Admin',
      role: UserRole.SUPER_ADMIN,
      referralCode: 'ADMIN001',
      level: 99,
      xp: 99999,
      title: 'Platform Administrator',
    },
  });

  const accountTypes = Object.values(AccountType);
  for (const type of accountTypes) {
    await prisma.account.upsert({
      where: { userId_type: { userId: admin.id, type } },
      update: {},
      create: {
        userId: admin.id,
        type,
        balance: type === AccountType.MAIN ? 1000000 : type === AccountType.SAVINGS ? 500000 : 0,
      },
    });
  }

  console.log(`Admin user: ${adminEmail}`);

  await prisma.currencyMetrics.upsert({
    where: { id: 'nexium-global' },
    update: {},
    create: {
      id: 'nexium-global',
      totalSupply: 1000000000,
      circulating: 1500000,
      burned: 50000,
      inflationRate: 0.002,
      velocity: 1250,
      rarityIndex: 0.9985,
    },
  });

  const assets = [
    { symbol: 'NEXO', name: 'Nexora Corp', type: AssetType.NEXORA_ASSET, price: 150.0 },
    { symbol: 'QTMX', name: 'Quantum Matrix Index', type: AssetType.INDEX, price: 1250.5 },
    { symbol: 'NXC', name: 'Nexium Coin', type: AssetType.CRYPTO, price: 42.75 },
    { symbol: 'TECH', name: 'TechNova Inc', type: AssetType.STOCK, price: 88.2 },
    { symbol: 'MINE', name: 'DeepCore Mining', type: AssetType.STOCK, price: 34.5 },
    { symbol: 'REAL', name: 'MetaEstate REIT', type: AssetType.STOCK, price: 210.0 },
    { symbol: 'SOLR', name: 'SolarGrid Energy', type: AssetType.STOCK, price: 67.8 },
    { symbol: 'BYTE', name: 'ByteChain', type: AssetType.CRYPTO, price: 0.85 },
  ];

  for (const asset of assets) {
    await prisma.asset.upsert({
      where: { symbol: asset.symbol },
      update: { price: asset.price },
      create: {
        ...asset,
        change24h: Math.random() * 10 - 5,
        volume24h: Math.random() * 100000,
        marketCap: asset.price * 1000000,
        description: `${asset.name} — traded on the NEXORA exchange`,
      },
    });
  }

  const items = [
    { slug: 'bronze-badge', name: 'Bronze Badge', rarity: ItemRarity.COMMON, category: 'cosmetic', basePrice: 50 },
    { slug: 'silver-badge', name: 'Silver Badge', rarity: ItemRarity.UNCOMMON, category: 'cosmetic', basePrice: 150 },
    { slug: 'gold-badge', name: 'Gold Badge', rarity: ItemRarity.RARE, category: 'cosmetic', basePrice: 500 },
    { slug: 'plasma-sword', name: 'Plasma Sword', rarity: ItemRarity.EPIC, category: 'cosmetic', basePrice: 1200 },
    { slug: 'void-crown', name: 'Void Crown', rarity: ItemRarity.LEGENDARY, category: 'cosmetic', basePrice: 5000 },
    { slug: 'nexium-core', name: 'Nexium Core', rarity: ItemRarity.MYTHIC, category: 'cosmetic', basePrice: 25000 },
    { slug: 'case-common', name: 'Common Fragment', rarity: ItemRarity.COMMON, category: 'case_reward', basePrice: 10 },
    { slug: 'case-uncommon', name: 'Uncommon Shard', rarity: ItemRarity.UNCOMMON, category: 'case_reward', basePrice: 25 },
    { slug: 'case-rare', name: 'Rare Crystal', rarity: ItemRarity.RARE, category: 'case_reward', basePrice: 75 },
    { slug: 'case-epic', name: 'Epic Relic', rarity: ItemRarity.EPIC, category: 'case_reward', basePrice: 200 },
    { slug: 'case-legendary', name: 'Legendary Artifact', rarity: ItemRarity.LEGENDARY, category: 'case_reward', basePrice: 1000 },
    { slug: 'case-mythic', name: 'Mythic Essence', rarity: ItemRarity.MYTHIC, category: 'case_reward', basePrice: 5000 },
  ];

  for (const item of items) {
    await prisma.item.upsert({
      where: { slug: item.slug },
      update: {},
      create: item,
    });
  }

  const quests = [
    { slug: 'daily-login', title: 'Daily Login', description: 'Log in to NEXORA', period: QuestPeriod.DAILY, target: 1, action: 'login', nexReward: 25, xpReward: 10 },
    { slug: 'daily-transfer', title: 'Send a Transfer', description: 'Send NEX to another user', period: QuestPeriod.DAILY, target: 1, action: 'transfer', nexReward: 50, xpReward: 15 },
    { slug: 'daily-wheel', title: 'Spin the Wheel', description: 'Spin the daily wheel', period: QuestPeriod.DAILY, target: 1, action: 'wheel_spin', nexReward: 30, xpReward: 10 },
    { slug: 'daily-case', title: 'Open a Case', description: 'Open a loot case', period: QuestPeriod.DAILY, target: 1, action: 'open_case', nexReward: 40, xpReward: 20 },
    { slug: 'weekly-invest', title: 'Make an Investment', description: 'Buy any asset', period: QuestPeriod.WEEKLY, target: 3, action: 'invest', nexReward: 200, xpReward: 50 },
    { slug: 'weekly-business', title: 'Business Tycoon', description: 'Collect business revenue 5 times', period: QuestPeriod.WEEKLY, target: 5, action: 'collect_revenue', nexReward: 300, xpReward: 75 },
    { slug: 'weekly-social', title: 'Social Butterfly', description: 'Send 10 messages', period: QuestPeriod.WEEKLY, target: 10, action: 'send_message', nexReward: 150, xpReward: 40 },
  ];

  for (const quest of quests) {
    await prisma.quest.upsert({
      where: { slug: quest.slug },
      update: {},
      create: quest,
    });
  }

  const achievements = [
    { slug: 'first-steps', name: 'First Steps', description: 'Create your NEXORA account', icon: '👣', category: 'onboarding', nexReward: 50, xpReward: 25 },
    { slug: 'first-transfer', name: 'Money Mover', description: 'Complete your first transfer', icon: '💸', category: 'wallet', nexReward: 100, xpReward: 50 },
    { slug: 'wheel-master', name: 'Wheel Master', description: 'Spin the wheel 10 times', icon: '🎡', category: 'games', nexReward: 200, xpReward: 100 },
    { slug: 'investor', name: 'Budding Investor', description: 'Make your first investment', icon: '📈', category: 'investments', nexReward: 150, xpReward: 75 },
    { slug: 'tycoon', name: 'Business Tycoon', description: 'Own 3 businesses', icon: '🏢', category: 'business', nexReward: 500, xpReward: 200 },
    { slug: 'legend', name: 'NEXORA Legend', description: 'Reach level 50', icon: '⭐', category: 'progression', nexReward: 1000, xpReward: 500, rarity: ItemRarity.LEGENDARY },
    { slug: 'secret-whale', name: 'Secret Whale', description: 'Hold over 100,000 NEX', icon: '🐋', category: 'wallet', nexReward: 2000, xpReward: 1000, rarity: ItemRarity.MYTHIC, isSecret: true },
  ];

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { slug: achievement.slug },
      update: {},
      create: achievement,
    });
  }

  const seasonStart = new Date();
  const seasonEnd = new Date();
  seasonEnd.setMonth(seasonEnd.getMonth() + 3);

  const season = await prisma.season.upsert({
    where: { number: 1 },
    update: { isActive: true },
    create: {
      name: 'Genesis Season',
      number: 1,
      description: 'The inaugural season of NEXORA',
      startsAt: seasonStart,
      endsAt: seasonEnd,
      isActive: true,
      theme: 'cyber-finance',
    },
  });

  const battlePass = await prisma.battlePass.upsert({
    where: { seasonId: season.id },
    update: {},
    create: { seasonId: season.id, maxTier: 50 },
  });

  const tiers = [
    { tier: 1, xpRequired: 100, freeReward: { nex: 25 }, premiumReward: { nex: 50 } },
    { tier: 5, xpRequired: 500, freeReward: { nex: 50 }, premiumReward: { nex: 100, xp: 25 } },
    { tier: 10, xpRequired: 1000, freeReward: { nex: 100, xp: 25 }, premiumReward: { nex: 200, xp: 50 } },
    { tier: 25, xpRequired: 5000, freeReward: { nex: 250, xp: 50 }, premiumReward: { nex: 500, xp: 100 } },
    { tier: 50, xpRequired: 15000, freeReward: { nex: 1000, xp: 200 }, premiumReward: { nex: 2500, xp: 500 }, isPremium: true },
  ];

  for (const t of tiers) {
    await prisma.battlePassTier.upsert({
      where: { battlePassId_tier: { battlePassId: battlePass.id, tier: t.tier } },
      update: {},
      create: {
        battlePassId: battlePass.id,
        tier: t.tier,
        xpRequired: t.xpRequired,
        freeReward: t.freeReward,
        premiumReward: t.premiumReward,
        isPremium: t.isPremium ?? false,
      },
    });
  }

  await prisma.chatRoom.upsert({
    where: { slug: 'global' },
    update: {},
    create: { name: 'Global Chat', slug: 'global', isGlobal: true },
  });

  const tournamentStart = new Date();
  const tournamentEnd = new Date();
  tournamentEnd.setDate(tournamentEnd.getDate() + 7);

  if ((await prisma.tournament.count()) === 0) {
    await prisma.tournament.createMany({
      data: [
        {
          name: 'Weekly Trading Challenge',
          description: 'Compete for the top trading score',
          prizePool: 10000,
          entryFee: 50,
          maxPlayers: 100,
          startsAt: tournamentStart,
          endsAt: tournamentEnd,
          isActive: true,
        },
        {
          name: 'NEXORA Championship',
          description: 'The ultimate NEXORA competition',
          prizePool: 50000,
          entryFee: 200,
          maxPlayers: 50,
          startsAt: tournamentStart,
          endsAt: tournamentEnd,
          isActive: true,
        },
      ],
    });
  }

  await prisma.platformSettings.upsert({
    where: { id: 'platform' },
    update: {},
    create: {
      id: 'platform',
      data: {
        maintenanceMode: false,
        registrationEnabled: true,
        wheelMaxSpins: 3,
        caseCost: 100,
        chestCost: 250,
        referralBonus: 100,
        startingMainBalance: 1000,
        startingSavingsBalance: 500,
        marketplaceFee: 0.05,
        auctionFee: 0.05,
      },
    },
  });

  if ((await prisma.economyEvent.count()) === 0) {
    await prisma.economyEvent.createMany({
      data: [
        {
          type: 'SEASON',
          title: 'Genesis Season Launch',
          description: 'Welcome to the first season of NEXORA!',
          multiplier: 1.1,
          startsAt: seasonStart,
          endsAt: seasonEnd,
          isActive: true,
        },
        {
          type: 'BOOM',
          title: 'Market Boom',
          description: 'Increased rewards across all activities',
          multiplier: 1.25,
          startsAt: new Date(),
          endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
      ],
    });
  }

  const clan1 = await prisma.clan.upsert({
    where: { tag: 'NEX' },
    update: {},
    create: { name: 'Nexora Guardians', tag: 'NEX', description: 'Elite traders of the galaxy', level: 5, treasury: 25000 },
  });
  const clan2 = await prisma.clan.upsert({
    where: { tag: 'TRD' },
    update: {},
    create: { name: 'Trade Masters', tag: 'TRD', description: 'Market domination crew', level: 3, treasury: 12000 },
  });
  await prisma.clanMember.upsert({
    where: { clanId_userId: { clanId: clan1.id, userId: admin.id } },
    update: {},
    create: { clanId: clan1.id, userId: admin.id, role: 'LEADER' },
  });

  await prisma.corporation.upsert({
    where: { ticker: 'NEXO' },
    update: {},
    create: { name: 'Nexora Holdings', ticker: 'NEXO', description: 'Flagship corporation', valuation: 500000, revenue: 50000 },
  });
  await prisma.corporation.upsert({
    where: { ticker: 'QTMX' },
    update: {},
    create: { name: 'Quantum Matrix Corp', ticker: 'QTMX', description: 'Tech investments', valuation: 250000, revenue: 30000 },
  });

  const contractCount = await prisma.contract.count();
  if (contractCount === 0) {
    await prisma.contract.createMany({
      data: [
        { posterId: admin.id, title: 'Deliver 100 NEX', description: 'Transfer 100 NEX to escrow account', reward: 150, status: ContractStatus.OPEN },
        { posterId: admin.id, title: 'Market Research', description: 'Analyze top 5 assets this week', reward: 300, status: ContractStatus.OPEN },
        { posterId: admin.id, title: 'Recruit 3 Friends', description: 'Invite new players to NEXORA', reward: 500, status: ContractStatus.OPEN },
      ],
    });
  }

  const shopItem = await prisma.item.findFirst({ where: { slug: 'gold-badge' } });
  if (shopItem) {
    const existingAuction = await prisma.auction.findFirst({ where: { itemId: shopItem.id } });
    if (!existingAuction) {
      await prisma.auction.create({
        data: {
          sellerId: admin.id,
          itemId: shopItem.id,
          startPrice: 400,
          currentBid: 0,
          buyoutPrice: 800,
          endsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE' as const,
        },
      });
    }
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
