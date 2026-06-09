import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountType, TransactionType } from '@prisma/client';
import { WalletOperationsService } from '../common/services/wallet-operations.service';
import { toNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletOps: WalletOperationsService,
  ) {}

  private async resolveUser(username: string) {
    const clean = username.replace(/^@/, '').trim();
    const user = await this.prisma.user.findUnique({ where: { username: clean } });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user;
  }

  async lookupPartner(username: string) {
    const user = await this.resolveUser(username);
    const items = await this.prisma.inventoryItem.findMany({
      where: { userId: user.id, quantity: { gt: 0 } },
      include: { item: true },
    });
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      level: user.level,
      inventory: items
        .filter((i) => i.item.isTradeable)
        .map((i) => ({
          itemId: i.itemId,
          name: i.item.name,
          rarity: i.item.rarity,
          quantity: i.quantity,
        })),
    };
  }

  async createTrade(
    fromUserId: string,
    body: {
      type: 'gift' | 'exchange';
      toUsername: string;
      fromItemId?: string;
      fromQty?: number;
      toItemId?: string;
      toQty?: number;
      fromNexAmount?: number;
      toNexAmount?: number;
      nexAmount?: number;
      message?: string;
    },
  ) {
    const toUser = await this.resolveUser(body.toUsername);
    if (toUser.id === fromUserId) throw new BadRequestException('Нельзя торговать с собой');

    const fromNex = body.fromNexAmount ?? body.nexAmount ?? 0;
    const toNex = body.toNexAmount ?? 0;

    if (body.type === 'gift') {
      if (!body.fromItemId && fromNex <= 0) {
        throw new BadRequestException('Укажите предмет или сумму NEX');
      }
      if (body.toItemId || toNex > 0) {
        throw new BadRequestException('В подарке нельзя запрашивать что-то взамен');
      }
    } else {
      const hasFrom = body.fromItemId || fromNex > 0;
      const hasTo = body.toItemId || toNex > 0;
      if (!hasFrom || !hasTo) {
        throw new BadRequestException('Обмен: укажите что отдаёте и что хотите получить');
      }
    }

    if (body.fromItemId) {
      const inv = await this.prisma.inventoryItem.findFirst({
        where: { userId: fromUserId, itemId: body.fromItemId, quantity: { gte: body.fromQty ?? 1 } },
      });
      if (!inv) throw new BadRequestException('Предмет не найден в вашем инвентаре');
    }

    if (fromNex > 0) {
      const account = await this.prisma.account.findFirst({
        where: { userId: fromUserId, type: AccountType.MAIN },
      });
      if (!account || toNumber(account.balance) < fromNex) {
        throw new BadRequestException('Недостаточно NEX на основном счёте');
      }
    }

    return this.prisma.playerTrade.create({
      data: {
        type: body.type.toUpperCase(),
        fromUserId,
        toUserId: toUser.id,
        fromItemId: body.fromItemId,
        fromQty: body.fromQty ?? (body.fromItemId ? 1 : 0),
        toItemId: body.toItemId,
        toQty: body.toQty ?? (body.toItemId ? 1 : 0),
        fromNexAmount: fromNex,
        toNexAmount: toNex,
        nexAmount: fromNex,
        message: body.message,
      },
      include: {
        toUser: { select: { username: true, displayName: true } },
        fromUser: { select: { username: true, displayName: true } },
      },
    });
  }

  async getIncoming(userId: string) {
    const trades = await this.prisma.playerTrade.findMany({
      where: { toUserId: userId, status: 'PENDING' },
      include: {
        fromUser: { select: { username: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.enrichTrades(trades);
  }

  async getOutgoing(userId: string) {
    const trades = await this.prisma.playerTrade.findMany({
      where: { fromUserId: userId },
      include: {
        fromUser: { select: { username: true, displayName: true } },
        toUser: { select: { username: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return this.enrichTrades(trades);
  }

  private async enrichTrades(
    trades: Array<{
      id: string;
      type: string;
      status: string;
      fromItemId: string | null;
      toItemId: string | null;
      fromQty: number;
      toQty: number;
      fromNexAmount: unknown;
      toNexAmount: unknown;
      message: string | null;
      fromUser?: { username: string; displayName: string };
      toUser?: { username: string; displayName: string };
    }>,
  ) {
    const itemIds = [
      ...trades.map((t) => t.fromItemId),
      ...trades.map((t) => t.toItemId),
    ].filter(Boolean) as string[];
    const items = itemIds.length
      ? await this.prisma.item.findMany({ where: { id: { in: itemIds } } })
      : [];
    const itemMap = new Map(items.map((i) => [i.id, i.name]));

    return trades.map((t) => ({
      ...t,
      fromNexAmount: toNumber(t.fromNexAmount),
      toNexAmount: toNumber(t.toNexAmount),
      fromItemName: t.fromItemId ? itemMap.get(t.fromItemId) : null,
      toItemName: t.toItemId ? itemMap.get(t.toItemId) : null,
    }));
  }

  async acceptTrade(userId: string, tradeId: string) {
    const trade = await this.prisma.playerTrade.findUnique({ where: { id: tradeId } });
    if (!trade || trade.toUserId !== userId) throw new NotFoundException('Сделка не найдена');
    if (trade.status !== 'PENDING') throw new BadRequestException('Сделка уже завершена');

    const fromNex = toNumber(trade.fromNexAmount ?? trade.nexAmount);
    const toNex = toNumber(trade.toNexAmount);

    await this.prisma.$transaction(async (tx) => {
      if (trade.fromItemId) {
        const fromInv = await tx.inventoryItem.findFirst({
          where: { userId: trade.fromUserId, itemId: trade.fromItemId, quantity: { gte: trade.fromQty } },
        });
        if (!fromInv) throw new BadRequestException('У отправителя нет предмета');

        await tx.inventoryItem.update({
          where: { id: fromInv.id },
          data: { quantity: { decrement: trade.fromQty } },
        });
        if (fromInv.quantity === trade.fromQty) {
          await tx.inventoryItem.delete({ where: { id: fromInv.id } });
        }

        const toInv = await tx.inventoryItem.findFirst({
          where: { userId: trade.toUserId, itemId: trade.fromItemId },
        });
        if (toInv) {
          await tx.inventoryItem.update({
            where: { id: toInv.id },
            data: { quantity: { increment: trade.fromQty } },
          });
        } else {
          await tx.inventoryItem.create({
            data: { userId: trade.toUserId, itemId: trade.fromItemId, quantity: trade.fromQty },
          });
        }
      }

      if (trade.type === 'EXCHANGE' && trade.toItemId) {
        const toInv = await tx.inventoryItem.findFirst({
          where: { userId: trade.toUserId, itemId: trade.toItemId, quantity: { gte: trade.toQty } },
        });
        if (!toInv) throw new BadRequestException('У вас нет запрошенного предмета');

        await tx.inventoryItem.update({
          where: { id: toInv.id },
          data: { quantity: { decrement: trade.toQty } },
        });
        if (toInv.quantity === trade.toQty) {
          await tx.inventoryItem.delete({ where: { id: toInv.id } });
        }

        const fromInv = await tx.inventoryItem.findFirst({
          where: { userId: trade.fromUserId, itemId: trade.toItemId },
        });
        if (fromInv) {
          await tx.inventoryItem.update({
            where: { id: fromInv.id },
            data: { quantity: { increment: trade.toQty } },
          });
        } else {
          await tx.inventoryItem.create({
            data: { userId: trade.fromUserId, itemId: trade.toItemId, quantity: trade.toQty },
          });
        }
      }

      if (fromNex > 0) {
        await this.walletOps.debit(
          {
            userId: trade.fromUserId,
            accountType: AccountType.MAIN,
            amount: fromNex,
            type: TransactionType.TRANSFER,
            description: `Обмен #${trade.id.slice(0, 8)}`,
            toUserId: trade.toUserId,
          },
          tx,
        );
        await this.walletOps.credit(
          {
            userId: trade.toUserId,
            accountType: AccountType.MAIN,
            amount: fromNex,
            type: TransactionType.TRANSFER,
            description: `Обмен #${trade.id.slice(0, 8)}`,
            fromUserId: trade.fromUserId,
          },
          tx,
        );
      }

      if (toNex > 0) {
        await this.walletOps.debit(
          {
            userId: trade.toUserId,
            accountType: AccountType.MAIN,
            amount: toNex,
            type: TransactionType.TRANSFER,
            description: `Доплата по обмену #${trade.id.slice(0, 8)}`,
            toUserId: trade.fromUserId,
          },
          tx,
        );
        await this.walletOps.credit(
          {
            userId: trade.fromUserId,
            accountType: AccountType.MAIN,
            amount: toNex,
            type: TransactionType.TRANSFER,
            description: `Доплата по обмену #${trade.id.slice(0, 8)}`,
            fromUserId: trade.toUserId,
          },
          tx,
        );
      }

      await tx.playerTrade.update({
        where: { id: tradeId },
        data: { status: 'COMPLETED' },
      });
    });

    return { success: true };
  }

  async cancelTrade(userId: string, tradeId: string) {
    const trade = await this.prisma.playerTrade.findUnique({ where: { id: tradeId } });
    if (!trade) throw new NotFoundException('Сделка не найдена');
    if (trade.fromUserId !== userId && trade.toUserId !== userId) {
      throw new BadRequestException('Нет доступа');
    }
    if (trade.status !== 'PENDING') throw new BadRequestException('Сделка уже завершена');

    await this.prisma.playerTrade.update({
      where: { id: tradeId },
      data: { status: 'CANCELLED' },
    });
    return { success: true };
  }
}
