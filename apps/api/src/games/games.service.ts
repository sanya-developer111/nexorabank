import { BadRequestException, Injectable } from '@nestjs/common';
import { AccountType, ItemRarity, Prisma, TransactionType } from '@prisma/client';
import { WalletOperationsService } from '../common/services/wallet-operations.service';
import { weightedRandom, WeightedOption } from '../common/utils/random.util';
import { toNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';
import { QuestsService } from '../quests/quests.service';
import { PremiumService } from '../premium/premium.service';
import { AchievementsService } from '../achievements/achievements.service';
import { syncUserLevel } from '../common/utils/level.util';

const WHEEL_MAX_SPINS = 3;
const CASE_COST = 100;
const CHEST_COST = 250;

const WHEEL_PRIZES = [
  { prize: '10 NEX', amount: 10, weight: 30 },
  { prize: '25 NEX', amount: 25, weight: 25 },
  { prize: '50 NEX', amount: 50, weight: 20 },
  { prize: '100 NEX', amount: 100, weight: 12 },
  { prize: '250 NEX', amount: 250, weight: 8 },
  { prize: '500 NEX', amount: 500, weight: 4 },
  { prize: 'JACKPOT 1000 NEX', amount: 1000, weight: 1 },
];

const WHEEL_PREMIUM_PLUS = [
  { prize: 'Premium 150 NEX', amount: 150, weight: 16 },
  { prize: 'Premium 350 NEX', amount: 350, weight: 6 },
];

const WHEEL_PREMIUM_PRO = [
  { prize: 'Premium 600 NEX', amount: 600, weight: 4 },
];

const WHEEL_PREMIUM_ELITE = [
  { prize: 'ELITE JACKPOT 3000 NEX', amount: 3000, weight: 1 },
  { prize: 'Элитный осколок', amount: 0, weight: 4, itemSlug: 'premium-wheel-shard' },
];

function buildWheelPool(tier: 'starter' | 'pro' | 'elite' | null) {
  const pool = [...WHEEL_PRIZES];
  if (tier) pool.push(...WHEEL_PREMIUM_PLUS);
  if (tier === 'pro' || tier === 'elite') pool.push(...WHEEL_PREMIUM_PRO);
  if (tier === 'elite') pool.push(...WHEEL_PREMIUM_ELITE);
  return pool;
}

const CASE_RARITY_WEIGHTS: WeightedOption<ItemRarity>[] = [
  { value: ItemRarity.COMMON, weight: 50 },
  { value: ItemRarity.UNCOMMON, weight: 25 },
  { value: ItemRarity.RARE, weight: 15 },
  { value: ItemRarity.EPIC, weight: 7 },
  { value: ItemRarity.LEGENDARY, weight: 2.5 },
  { value: ItemRarity.MYTHIC, weight: 0.5 },
];

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletOps: WalletOperationsService,
    private readonly questsService: QuestsService,
    private readonly premiumService: PremiumService,
    private readonly achievementsService: AchievementsService,
  ) {}

  private async countWheelCharms(userId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const charms = await db.inventoryItem.findMany({
      where: { userId, quantity: { gt: 0 }, item: { slug: 'wheel-charm' } },
      include: { item: true },
    });
    return charms.reduce((s, c) => s + c.quantity, 0);
  }

  private async consumeWheelCharm(userId: string, tx: Prisma.TransactionClient) {
    const inv = await tx.inventoryItem.findFirst({
      where: { userId, quantity: { gt: 0 }, item: { slug: 'wheel-charm' } },
      include: { item: true },
    });
    if (!inv) return false;
    if (inv.quantity <= 1) {
      await tx.inventoryItem.delete({ where: { id: inv.id } });
    } else {
      await tx.inventoryItem.update({
        where: { id: inv.id },
        data: { quantity: { decrement: 1 } },
      });
    }
    return true;
  }

  async getWheelSpinsInfo(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Пользователь не найден');

    const tier = await this.premiumService.getActiveTier(userId);
    const baseMax = this.premiumService.getWheelMaxSpins(tier);
    const bonusCharms = await this.countWheelCharms(userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastSpin = user.lastWheelSpin ? new Date(user.lastWheelSpin) : null;
    let spinsToday = user.wheelSpinsToday;
    if (!lastSpin || lastSpin < today) spinsToday = 0;

    const baseRemaining = Math.max(0, baseMax - spinsToday);
    const totalRemaining = baseRemaining + bonusCharms;

    const last = await this.prisma.wheelSpin.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      spinsRemaining: totalRemaining,
      baseSpinsRemaining: baseRemaining,
      bonusCharms,
      maxSpinsPerDay: baseMax,
      lastPrize: last?.prize,
    };
  }

  async spinWheel(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Пользователь не найден');

    const tier = await this.premiumService.getActiveTier(userId);
    const maxSpins = this.premiumService.getWheelMaxSpins(tier);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastSpin = user.lastWheelSpin ? new Date(user.lastWheelSpin) : null;
    let spinsToday = user.wheelSpinsToday;

    if (!lastSpin || lastSpin < today) {
      spinsToday = 0;
    }

    const bonusCharms = await this.countWheelCharms(userId);
    const usingCharm = spinsToday >= maxSpins;

    if (spinsToday >= maxSpins && bonusCharms <= 0) {
      throw new BadRequestException(`Лимит вращений на сегодня: ${maxSpins}. Купите талисман колеса для доп. прокрута.`);
    }

    const pool = buildWheelPool(tier);
    const prize = weightedRandom(pool.map((p) => ({ value: p, weight: p.weight })));
    const itemSlug = 'itemSlug' in prize ? (prize as { itemSlug?: string }).itemSlug : undefined;

    await this.prisma.$transaction(async (tx) => {
      if (usingCharm) {
        const consumed = await this.consumeWheelCharm(userId, tx);
        if (!consumed) throw new BadRequestException('Нет талисманов колеса');
      }

      await tx.wheelSpin.create({
        data: { userId, prize: prize.prize, amount: prize.amount },
      });

      if (!usingCharm) {
        await tx.user.update({
          where: { id: userId },
          data: { wheelSpinsToday: spinsToday + 1, lastWheelSpin: new Date() },
        });
      } else {
        await tx.user.update({
          where: { id: userId },
          data: { lastWheelSpin: new Date() },
        });
      }

      if (prize.amount > 0) {
        await this.walletOps.credit(
          {
            userId,
            accountType: AccountType.MAIN,
            amount: prize.amount,
            type: TransactionType.WHEEL,
            description: `Wheel spin: ${prize.prize}`,
          },
          tx,
        );
      }

      if (itemSlug) {
        const item = await tx.item.findFirst({ where: { slug: itemSlug } });
        if (item) {
          const inv = await tx.inventoryItem.findFirst({ where: { userId, itemId: item.id } });
          if (inv) {
            await tx.inventoryItem.update({
              where: { id: inv.id },
              data: { quantity: { increment: 1 } },
            });
          } else {
            await tx.inventoryItem.create({ data: { userId, itemId: item.id } });
          }
        }
      }
    });

    await this.questsService.trackProgress(userId, 'wheel_spin');

    const spinCount = await this.prisma.wheelSpin.count({ where: { userId } });
    await this.achievementsService.checkAndUnlock(userId, 'wheel-master', spinCount >= 3);

    const bonusAfter = usingCharm ? bonusCharms - 1 : bonusCharms;
    const baseRemaining = Math.max(0, maxSpins - (usingCharm ? spinsToday : spinsToday + 1));

    return {
      prize: prize.prize,
      amount: prize.amount,
      spinsRemaining: baseRemaining + bonusAfter,
      usedCharm: usingCharm,
    };
  }

  async openCase(userId: string, caseType = 'standard') {
    const items = await this.prisma.item.findMany({ where: { category: 'case_reward' } });
    if (!items.length) throw new BadRequestException('No case rewards configured');

    const rarity = weightedRandom(CASE_RARITY_WEIGHTS);
    const eligible = items.filter((i) => i.rarity === rarity);
    const wonItem = eligible[Math.floor(Math.random() * eligible.length)] ?? items[0];

    await this.prisma.$transaction(async (tx) => {
      await this.walletOps.debit(
        {
          userId,
          amount: CASE_COST,
          type: TransactionType.CASE,
          description: `Opened case: ${caseType}`,
        },
        tx,
      );

      await tx.caseOpen.create({
        data: { userId, caseType, itemWon: wonItem.name, rarity: wonItem.rarity },
      });

      const existing = await tx.inventoryItem.findFirst({
        where: { userId, itemId: wonItem.id },
      });
      if (existing) {
        await tx.inventoryItem.update({
          where: { id: existing.id },
          data: { quantity: { increment: 1 } },
        });
      } else {
        await tx.inventoryItem.create({
          data: { userId, itemId: wonItem.id },
        });
      }
    });

    await this.questsService.trackProgress(userId, 'open_case');

    return { item: wonItem, rarity: wonItem.rarity, cost: CASE_COST };
  }

  async openChest(userId: string, chestType = 'gold') {
    const nexReward = weightedRandom([
      { value: 50, weight: 30 },
      { value: 100, weight: 25 },
      { value: 200, weight: 20 },
      { value: 500, weight: 15 },
      { value: 1000, weight: 8 },
      { value: 2500, weight: 2 },
    ]);

    const xpReward = weightedRandom([
      { value: 25, weight: 40 },
      { value: 50, weight: 30 },
      { value: 100, weight: 20 },
      { value: 250, weight: 10 },
    ]);

    const rewards = { nex: nexReward, xp: xpReward };

    await this.prisma.$transaction(async (tx) => {
      await this.walletOps.debit(
        {
          userId,
          amount: CHEST_COST,
          type: TransactionType.CHEST,
          description: `Opened chest: ${chestType}`,
        },
        tx,
      );

      await tx.chestOpen.create({
        data: { userId, chestType, rewards },
      });

      await this.walletOps.credit(
        {
          userId,
          amount: nexReward,
          type: TransactionType.CHEST,
          description: `Chest reward: ${nexReward} NEX`,
        },
        tx,
      );

      await tx.user.update({
        where: { id: userId },
        data: { xp: { increment: xpReward } },
      });
    });

    return { rewards, cost: CHEST_COST };
  }

  async getWheelHistory(userId: string) {
    return this.prisma.wheelSpin.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }).then((spins) =>
      spins.map((s) => ({ ...s, amount: toNumber(s.amount) })),
    );
  }

  getMiniGameInfo() {
    return {
      minBet: 10,
      maxBet: 50000,
      games: [
        {
          id: 'coinflip',
          name: 'Орёл и решка',
          description: 'Выберите сторону и множитель. Выигрыш = ставка × множитель.',
          multipliers: [
            { value: 2, winChance: 45 },
            { value: 3, winChance: 30 },
            { value: 5, winChance: 18 },
          ],
        },
        {
          id: 'color',
          name: 'Красное или чёрное',
          description: 'Красное/чёрное — ×2. Зелёное (редко) — ×14.',
          multipliers: [
            { value: 2, winChance: 47, choice: 'red' },
            { value: 2, winChance: 47, choice: 'black' },
            { value: 14, winChance: 6, choice: 'green' },
          ],
        },
        {
          id: 'number',
          name: 'Угадай число',
          description: 'Число от 1 до 10. Точное попадание — ×9.',
          multipliers: [{ value: 9, winChance: 10 }],
        },
        {
          id: 'dice',
          name: 'Кубик',
          description: 'Угадайте значение кубика 1–6. Точное попадание — ×5.',
          multipliers: [{ value: 5, winChance: 16 }],
        },
        {
          id: 'hilo',
          name: 'Больше / меньше',
          description: 'Угадайте направление числа. Шанс ~30%, выплата ×1.7.',
          multipliers: [{ value: 1.7, winChance: 30 }],
        },
        {
          id: 'slots',
          name: 'Слоты',
          description: 'Три барабана. Три одинаковых символа — ×10, два — ×2.',
          multipliers: [
            { value: 10, winChance: 12 },
            { value: 2, winChance: 25 },
          ],
        },
      ],
    };
  }

  async playMiniGame(
    userId: string,
    dto: {
      game: string;
      bet: number;
      choice?: string;
      multiplier?: number;
      color?: string;
      guess?: number;
      hilo?: string;
    },
  ) {
    const bet = dto.bet;
    if (bet < 10 || bet > 50000) {
      throw new BadRequestException('Ставка от 10 до 50 000 NEX');
    }

    let won = false;
    let payoutMult = 0;
    const details: Record<string, Prisma.InputJsonValue> = { game: dto.game, bet };

    switch (dto.game) {
      case 'coinflip': {
        const mult = dto.multiplier ?? 2;
        if (![2, 3, 5].includes(mult)) {
          throw new BadRequestException('Множитель: 2, 3 или 5');
        }
        if (!dto.choice || !['heads', 'tails'].includes(dto.choice)) {
          throw new BadRequestException('Выберите heads или tails');
        }
        const winChance = { 2: 0.45, 3: 0.3, 5: 0.18 }[mult as 2 | 3 | 5];
        won = Math.random() < winChance;
        const outcome = won
          ? dto.choice
          : dto.choice === 'heads'
            ? 'tails'
            : 'heads';
        payoutMult = won ? mult : 0;
        details.choice = dto.choice;
        details.multiplier = mult;
        details.outcome = outcome;
        details.outcomeRu = outcome === 'heads' ? 'орёл' : 'решка';
        break;
      }
      case 'color': {
        if (!dto.color || !['red', 'black', 'green'].includes(dto.color)) {
          throw new BadRequestException('Выберите red, black или green');
        }
        const roll = Math.floor(Math.random() * 100);
        let zone: 'red' | 'black' | 'green';
        if (roll < 6) zone = 'green';
        else if (roll < 53) zone = 'red';
        else zone = 'black';
        won = zone === dto.color;
        payoutMult = won ? (dto.color === 'green' ? 14 : 2) : 0;
        details.color = dto.color;
        details.roll = zone;
        details.rollRu = zone === 'red' ? 'красное' : zone === 'black' ? 'чёрное' : 'зелёное';
        break;
      }
      case 'number': {
        const guess = dto.guess;
        if (!guess || guess < 1 || guess > 10) {
          throw new BadRequestException('Число от 1 до 10');
        }
        const roll = Math.floor(Math.random() * 10) + 1;
        won = roll === guess;
        payoutMult = won ? 9 : 0;
        details.guess = guess;
        details.roll = roll;
        break;
      }
      case 'dice': {
        const guess = dto.guess;
        if (!guess || guess < 1 || guess > 6) {
          throw new BadRequestException('Число от 1 до 6');
        }
        const roll = Math.floor(Math.random() * 6) + 1;
        won = roll === guess;
        payoutMult = won ? 5 : 0;
        details.guess = guess;
        details.roll = roll;
        break;
      }
      case 'hilo': {
        if (!dto.hilo || !['higher', 'lower'].includes(dto.hilo)) {
          throw new BadRequestException('Выберите «больше» или «меньше»');
        }
        const winChance = 0.3;
        won = Math.random() < winChance;
        payoutMult = won ? 1.7 : 0;
        const base = Math.floor(Math.random() * 60) + 20;
        let next: number;
        if (won) {
          next = dto.hilo === 'higher'
            ? Math.min(99, base + Math.floor(Math.random() * (99 - base)) + 1)
            : Math.max(1, base - Math.floor(Math.random() * (base - 1)) - 1);
        } else {
          next = dto.hilo === 'higher'
            ? Math.max(1, base - Math.floor(Math.random() * (base - 1)) - 1)
            : Math.min(99, base + Math.floor(Math.random() * (99 - base)) + 1);
        }
        if (next === base) next = won ? base + 1 : base - 1;
        details.hilo = dto.hilo;
        details.base = base;
        details.roll = next;
        details.hiloRu = dto.hilo === 'higher' ? 'больше' : 'меньше';
        break;
      }
      case 'slots': {
        const symbols = ['◈', '★', '♦', '7', '◆'];
        const reels = [
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)],
        ];
        if (reels[0] === reels[1] && reels[1] === reels[2]) {
          won = true;
          payoutMult = 10;
        } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
          won = true;
          payoutMult = 2;
        }
        details.reels = reels;
        break;
      }
      default:
        throw new BadRequestException('Неизвестная игра');
    }

    const payout = won ? bet * payoutMult : 0;
    const profit = won ? payout - bet : -bet;

    await this.prisma.$transaction(async (tx) => {
      await this.walletOps.debit(
        {
          userId,
          amount: bet,
          type: TransactionType.PURCHASE,
          description: `Мини-игра: ${dto.game}`,
          metadata: details,
        },
        tx,
      );

      if (won && payout > 0) {
        await this.walletOps.credit(
          {
            userId,
            amount: payout,
            type: TransactionType.REWARD,
            description: `Выигрыш: ${dto.game} ×${payoutMult}`,
            metadata: { ...details, payout },
          },
          tx,
        );
      }

      await tx.user.update({
        where: { id: userId },
        data: { xp: { increment: won ? 15 : 5 } },
      });
    });

    await syncUserLevel(this.prisma, userId);
    await this.questsService.trackProgress(userId, 'minigame');
    const plays = await this.prisma.transaction.count({
      where: { userId, description: { startsWith: 'Мини-игра:' } },
    });
    await this.achievementsService.checkAndUnlock(userId, 'gambler', plays >= 10);

    const account = await this.walletOps.getAccount(userId);
    return {
      won,
      bet,
      payout,
      profit,
      multiplier: payoutMult,
      balance: toNumber(account.balance),
      ...details,
    };
  }
}
