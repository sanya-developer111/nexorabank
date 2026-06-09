import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AccountType, AuctionStatus, TransactionType } from '@prisma/client';
import { paginate, PaginationDto } from '../common/dto/pagination.dto';
import { WalletOperationsService } from '../common/services/wallet-operations.service';
import { toNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuctionDto, PlaceBidDto } from './dto/create-auction.dto';

@Injectable()
export class AuctionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletOps: WalletOperationsService,
  ) {}

  async getActive(query: PaginationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [auctions, total] = await Promise.all([
      this.prisma.auction.findMany({
        where: { status: AuctionStatus.ACTIVE, endsAt: { gt: new Date() } },
        include: {
          item: true,
          seller: { select: { id: true, username: true, displayName: true } },
          bids: { orderBy: { amount: 'desc' }, take: 1, include: { bidder: { select: { username: true } } } },
        },
        orderBy: { endsAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.auction.count({
        where: { status: AuctionStatus.ACTIVE, endsAt: { gt: new Date() } },
      }),
    ]);

    const items = auctions.map((a) => ({
      id: a.id,
      startPrice: toNumber(a.startPrice),
      currentBid: toNumber(a.currentBid) || toNumber(a.startPrice),
      buyoutPrice: a.buyoutPrice ? toNumber(a.buyoutPrice) : undefined,
      endsAt: a.endsAt.toISOString(),
      item: { name: a.item.name, rarity: a.item.rarity },
      seller: { username: a.seller.username },
      bidCount: a.bids.length,
    }));

    return paginate(items, total, page, limit);
  }

  async create(userId: string, dto: CreateAuctionDto) {
    const inventory = await this.prisma.inventoryItem.findFirst({
      where: { userId, itemId: dto.itemId, quantity: { gte: 1 } },
      include: { item: true },
    });
    if (!inventory) throw new BadRequestException('Item not in inventory');

    const endsAt = new Date(dto.endsAt);
    if (endsAt <= new Date()) throw new BadRequestException('End date must be in the future');

    return this.prisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({
        where: { id: inventory.id },
        data: { quantity: { decrement: 1 } },
      });
      if (inventory.quantity === 1) {
        await tx.inventoryItem.delete({ where: { id: inventory.id } });
      }

      return tx.auction.create({
        data: {
          sellerId: userId,
          itemId: dto.itemId,
          startPrice: dto.startPrice,
          buyoutPrice: dto.buyoutPrice,
          endsAt,
        },
        include: { item: true },
      });
    });
  }

  async placeBid(userId: string, auctionId: string, dto: PlaceBidDto) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: { bids: { orderBy: { amount: 'desc' }, take: 1 } },
    });
    if (!auction || auction.status !== AuctionStatus.ACTIVE) {
      throw new NotFoundException('Auction not found');
    }
    if (auction.endsAt < new Date()) throw new BadRequestException('Auction ended');
    if (auction.sellerId === userId) throw new BadRequestException('Cannot bid on your own auction');

    const minBid = Math.max(toNumber(auction.currentBid), toNumber(auction.startPrice)) + 1;
    if (dto.amount < minBid) {
      throw new BadRequestException(`Minimum bid is ${minBid}`);
    }

    if (auction.buyoutPrice && dto.amount >= toNumber(auction.buyoutPrice)) {
      return this.buyout(userId, auctionId, dto.amount);
    }

    await this.prisma.$transaction(async (tx) => {
      const prevBid = auction.bids[0];
      if (prevBid) {
        await this.walletOps.credit(
          {
            userId: prevBid.bidderId,
            accountType: AccountType.ESCROW,
            amount: toNumber(prevBid.amount),
            type: TransactionType.AUCTION,
            description: 'Auction bid refund',
          },
          tx,
        );
      }

      await this.walletOps.debit(
        {
          userId,
          accountType: AccountType.MAIN,
          amount: dto.amount,
          type: TransactionType.AUCTION,
          description: 'Auction bid placed',
        },
        tx,
      );

      await this.walletOps.credit(
        {
          userId,
          accountType: AccountType.ESCROW,
          amount: dto.amount,
          type: TransactionType.AUCTION,
          description: 'Auction bid escrow',
        },
        tx,
      );

      await tx.auctionBid.create({
        data: { auctionId, bidderId: userId, amount: dto.amount },
      });

      await tx.auction.update({
        where: { id: auctionId },
        data: { currentBid: dto.amount },
      });
    });

    return { amount: dto.amount, message: 'Bid placed' };
  }

  private async buyout(userId: string, auctionId: string, amount: number) {
    await this.endAuction(auctionId, userId, amount);
    return { amount, message: 'Buyout successful' };
  }

  @Cron('*/60 * * * * *')
  async endExpiredAuctions() {
    const expired = await this.prisma.auction.findMany({
      where: { status: AuctionStatus.ACTIVE, endsAt: { lte: new Date() } },
      include: { bids: { orderBy: { amount: 'desc' }, take: 1 } },
    });

    for (const auction of expired) {
      const winner = auction.bids[0];
      await this.endAuction(auction.id, winner?.bidderId, winner ? toNumber(winner.amount) : 0);
    }
  }

  private async endAuction(auctionId: string, winnerId?: string, winningAmount = 0) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: { bids: true },
    });
    if (!auction || auction.status !== AuctionStatus.ACTIVE) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.auction.update({
        where: { id: auctionId },
        data: { status: AuctionStatus.ENDED },
      });

      if (winnerId && winningAmount > 0) {
        await this.walletOps.debit(
          {
            userId: winnerId,
            accountType: AccountType.ESCROW,
            amount: winningAmount,
            type: TransactionType.AUCTION,
            description: 'Auction payment',
          },
          tx,
        );

        await this.walletOps.credit(
          {
            userId: auction.sellerId,
            amount: winningAmount * 0.95,
            type: TransactionType.AUCTION,
            description: 'Auction sale',
            fromUserId: winnerId,
            fee: winningAmount * 0.05,
          },
          tx,
        );

        const existing = await tx.inventoryItem.findFirst({
          where: { userId: winnerId, itemId: auction.itemId },
        });
        if (existing) {
          await tx.inventoryItem.update({
            where: { id: existing.id },
            data: { quantity: { increment: 1 } },
          });
        } else {
          await tx.inventoryItem.create({
            data: { userId: winnerId, itemId: auction.itemId },
          });
        }
      } else {
        const existing = await tx.inventoryItem.findFirst({
          where: { userId: auction.sellerId, itemId: auction.itemId },
        });
        if (existing) {
          await tx.inventoryItem.update({
            where: { id: existing.id },
            data: { quantity: { increment: 1 } },
          });
        } else {
          await tx.inventoryItem.create({
            data: { userId: auction.sellerId, itemId: auction.itemId },
          });
        }
      }

      for (const bid of auction.bids) {
        if (bid.bidderId !== winnerId) {
          await this.walletOps.credit(
            {
              userId: bid.bidderId,
              accountType: AccountType.ESCROW,
              amount: toNumber(bid.amount),
              type: TransactionType.AUCTION,
              description: 'Возврат ставки',
            },
            tx,
          );
        }
      }
    });
  }

  async cancelAuction(userId: string, auctionId: string, isAdmin = false) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: { bids: true, item: true },
    });
    if (!auction) throw new NotFoundException('Аукцион не найден');
    if (!isAdmin && auction.sellerId !== userId) {
      throw new BadRequestException('Можно удалить только свой аукцион');
    }
    if (auction.status !== AuctionStatus.ACTIVE) {
      throw new BadRequestException('Аукцион уже завершён');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.auction.update({
        where: { id: auctionId },
        data: { status: AuctionStatus.CANCELLED },
      });

      const existing = await tx.inventoryItem.findFirst({
        where: { userId: auction.sellerId, itemId: auction.itemId },
      });
      if (existing) {
        await tx.inventoryItem.update({
          where: { id: existing.id },
          data: { quantity: { increment: 1 } },
        });
      } else {
        await tx.inventoryItem.create({
          data: { userId: auction.sellerId, itemId: auction.itemId },
        });
      }

      for (const bid of auction.bids) {
        await this.walletOps.credit(
          {
            userId: bid.bidderId,
            accountType: AccountType.ESCROW,
            amount: toNumber(bid.amount),
            type: TransactionType.AUCTION,
            description: 'Возврат ставки — аукцион отменён',
          },
          tx,
        );
      }
    });

    return { cancelled: true };
  }
}
