import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountType, Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreditDebitOptions {
  userId: string;
  accountType?: AccountType;
  amount: number;
  type: TransactionType;
  description?: string;
  metadata?: Prisma.InputJsonValue;
  fromUserId?: string;
  toUserId?: string;
  fee?: number;
}

@Injectable()
export class WalletOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAccount(userId: string, type: AccountType = AccountType.MAIN) {
    const account = await this.prisma.account.findUnique({
      where: { userId_type: { userId, type } },
    });
    if (!account) {
      throw new NotFoundException(`Account ${type} not found`);
    }
    return account;
  }

  async credit(options: CreditDebitOptions, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const accountType = options.accountType ?? AccountType.MAIN;
    const account = await client.account.findUnique({
      where: { userId_type: { userId: options.userId, type: accountType } },
    });
    if (!account) throw new NotFoundException(`Account ${accountType} not found`);

    const amount = new Prisma.Decimal(options.amount);
    const fee = new Prisma.Decimal(options.fee ?? 0);

    await client.account.update({
      where: { id: account.id },
      data: { balance: { increment: amount } },
    });

    return client.transaction.create({
      data: {
        userId: options.userId,
        accountId: account.id,
        type: options.type,
        amount,
        fee,
        description: options.description,
        metadata: options.metadata,
        fromUserId: options.fromUserId,
        toUserId: options.toUserId,
      },
    });
  }

  async debit(options: CreditDebitOptions, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const accountType = options.accountType ?? AccountType.MAIN;
    const account = await client.account.findUnique({
      where: { userId_type: { userId: options.userId, type: accountType } },
    });
    if (!account) throw new NotFoundException(`Account ${accountType} not found`);

    const amount = new Prisma.Decimal(options.amount);
    const fee = new Prisma.Decimal(options.fee ?? 0);
    const total = amount.plus(fee);

    if (account.balance.lessThan(total)) {
      throw new BadRequestException('Insufficient balance');
    }

    await client.account.update({
      where: { id: account.id },
      data: { balance: { decrement: total } },
    });

    return client.transaction.create({
      data: {
        userId: options.userId,
        accountId: account.id,
        type: options.type,
        amount: amount.negated(),
        fee,
        description: options.description,
        metadata: options.metadata,
        fromUserId: options.fromUserId,
        toUserId: options.toUserId,
      },
    });
  }

  async transfer(
    fromUserId: string,
    toUserId: string,
    amount: number,
    fromType: AccountType = AccountType.MAIN,
    toType: AccountType = AccountType.MAIN,
    description?: string,
  ) {
    if (fromUserId === toUserId) {
      throw new BadRequestException('Cannot transfer to yourself');
    }
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.debit(
        {
          userId: fromUserId,
          accountType: fromType,
          amount,
          type: TransactionType.TRANSFER,
          description: description ?? 'Transfer sent',
          toUserId,
        },
        tx,
      );
      await this.credit(
        {
          userId: toUserId,
          accountType: toType,
          amount,
          type: TransactionType.TRANSFER,
          description: description ?? 'Transfer received',
          fromUserId,
        },
        tx,
      );
      return { success: true, amount };
    });
  }
}
