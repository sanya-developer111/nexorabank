import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountType, TransactionType } from '@prisma/client';
import { AchievementsService } from '../achievements/achievements.service';
import { PremiumService } from '../premium/premium.service';
import { paginate, PaginationDto } from '../common/dto/pagination.dto';
import { WalletOperationsService } from '../common/services/wallet-operations.service';
import { toNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';
import { QuestsService } from '../quests/quests.service';
import { TransferDto } from './dto/transfer.dto';

const CASHBACK_ACCRUAL_HOURS_CAP = 24;

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletOps: WalletOperationsService,
    private readonly questsService: QuestsService,
    private readonly achievementsService: AchievementsService,
    private readonly premiumService: PremiumService,
  ) {}

  /** Кэшбэк только для премиум-пользователей, капает по часам */
  private async calcCashbackPending(
    userId: string,
    mainBalance: number,
    loginStreak: number,
    lastCashbackAt: Date | null,
    storedAccrued: number,
  ) {
    const tier = await this.premiumService.getActiveTier(userId);
    if (!tier) return 0;

    const baseRate = this.premiumService.getCashbackRate(tier);
    const streakBonus = Math.min(loginStreak * 0.001, 0.03);
    const dailyRate = mainBalance * 0.01 * (baseRate + streakBonus);
    const hourlyRate = dailyRate / 24;

    const anchor = lastCashbackAt ?? new Date(0);
    const hoursElapsed = Math.min(
      (Date.now() - anchor.getTime()) / (1000 * 60 * 60),
      CASHBACK_ACCRUAL_HOURS_CAP,
    );

    return Math.max(0, storedAccrued + hourlyRate * hoursElapsed);
  }

  async getAccounts(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId, isActive: true },
      orderBy: { type: 'asc' },
    });
    return accounts.map((a) => ({
      ...a,
      balance: toNumber(a.balance),
    }));
  }

  async getSummary(userId: string) {
    const accounts = await this.prisma.account.findMany({ where: { userId } });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const getBalance = (type: AccountType) =>
      toNumber(accounts.find((a) => a.type === type)?.balance ?? 0);

    const mainBalance = getBalance(AccountType.MAIN);
    const savingsBalance = getBalance(AccountType.SAVINGS);
    const investmentBalance = getBalance(AccountType.INVESTMENT);
    const businessBalance = getBalance(AccountType.BUSINESS);

    const cashbackPending = await this.calcCashbackPending(
      userId,
      mainBalance,
      user?.loginStreak ?? 0,
      user?.lastCashbackAt ?? null,
      toNumber(user?.cashbackAccrued ?? 0),
    );

    const tier = await this.premiumService.getActiveTier(userId);

    return {
      totalBalance: mainBalance + savingsBalance + investmentBalance + businessBalance,
      mainBalance,
      savingsBalance,
      investmentBalance,
      businessBalance,
      cashbackPending,
      cashbackAvailable: tier !== null,
      currency: 'NEX',
    };
  }

  async transfer(userId: string, dto: TransferDto) {
    let toUserId = dto.toUserId;
    if (dto.toUsername) {
      const user = await this.prisma.user.findUnique({ where: { username: dto.toUsername } });
      if (!user) throw new NotFoundException('Получатель не найден');
      toUserId = user.id;
    }
    if (!toUserId) throw new BadRequestException('Укажите toUserId или toUsername');

    const result = await this.walletOps.transfer(
      userId,
      toUserId,
      dto.amount,
      dto.fromAccount ?? AccountType.MAIN,
      dto.toAccount ?? AccountType.MAIN,
      dto.description,
    );

    await this.questsService.trackProgress(userId, 'transfer');
    await this.achievementsService.checkAndUnlock(userId, 'first-transfer', true);

    return result;
  }

  async withdrawToMain(userId: string, fromAccount: AccountType, amount: number) {
    if (fromAccount === AccountType.MAIN) {
      throw new BadRequestException('Нельзя перевести с основного на основной');
    }
    if (fromAccount === AccountType.ESCROW) {
      throw new BadRequestException('Эскроу-счёт недоступен для снятия');
    }
    if (amount <= 0) throw new BadRequestException('Сумма должна быть больше 0');

    const source = await this.prisma.account.findFirst({
      where: { userId, type: fromAccount },
    });
    if (!source || toNumber(source.balance) < amount) {
      throw new BadRequestException('Недостаточно средств на счёте');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.walletOps.debit(
        {
          userId,
          accountType: fromAccount,
          amount,
          type: TransactionType.WITHDRAWAL,
          description: `Перевод на основной счёт`,
        },
        tx,
      );
      await this.walletOps.credit(
        {
          userId,
          accountType: AccountType.MAIN,
          amount,
          type: TransactionType.DEPOSIT,
          description: `Снятие с ${fromAccount}`,
        },
        tx,
      );
    });

    return { amount, fromAccount, message: 'Средства переведены на основной счёт' };
  }

  async getTransactions(userId: string, query: PaginationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          fromUser: { select: { username: true, displayName: true } },
          toUser: { select: { username: true, displayName: true } },
        },
      }),
      this.prisma.transaction.count({ where: { userId } }),
    ]);

    return paginate(transactions, total, page, limit);
  }

  async getIncomingTransfers(userId: string, since?: string) {
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 60_000);
    const transfers = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.TRANSFER,
        amount: { gt: 0 },
        createdAt: { gt: sinceDate },
      },
      include: {
        fromUser: { select: { username: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return transfers.map((t) => ({
      id: t.id,
      amount: toNumber(t.amount),
      fromUsername: t.fromUser?.username,
      fromDisplayName: t.fromUser?.displayName,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  async claimCashback(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Пользователь не найден');

    const tier = await this.premiumService.getActiveTier(userId);
    if (!tier) {
      throw new BadRequestException('Кэшбэк доступен только с активной премиум-подпиской');
    }

    const accounts = await this.prisma.account.findMany({ where: { userId } });
    const mainBalance = toNumber(
      accounts.find((a) => a.type === AccountType.MAIN)?.balance ?? 0,
    );

    const amount = await this.calcCashbackPending(
      userId,
      mainBalance,
      user.loginStreak,
      user.lastCashbackAt,
      toNumber(user.cashbackAccrued),
    );

    if (amount < 0.01) {
      return { amount: 0, message: 'Кэшбэк ещё не накопился — подождите' };
    }

    const claimAmount = Math.floor(amount * 100) / 100;

    await this.prisma.$transaction(async (tx) => {
      await this.walletOps.credit(
        {
          userId,
          accountType: AccountType.MAIN,
          amount: claimAmount,
          type: TransactionType.CASHBACK,
          description: 'Получение кэшбэка',
        },
        tx,
      );
      await tx.user.update({
        where: { id: userId },
        data: { lastCashbackAt: new Date(), cashbackAccrued: 0 },
      });
    });

    return { amount: claimAmount, message: 'Кэшбэк получен' };
  }
}
