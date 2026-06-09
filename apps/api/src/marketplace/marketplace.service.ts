import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ListingStatus, TransactionType } from '@prisma/client';
import { paginate, PaginationDto } from '../common/dto/pagination.dto';
import { WalletOperationsService } from '../common/services/wallet-operations.service';
import { toNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';
import { PremiumService } from '../premium/premium.service';
import { CreateListingDto } from './dto/create-listing.dto';

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletOps: WalletOperationsService,
    private readonly premiumService: PremiumService,
  ) {}

  async getInventory(userId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { userId, quantity: { gt: 0 } },
      include: { item: true },
    });
    return items
      .filter((i) => i.item.isTradeable)
      .map((i) => ({
        inventoryId: i.id,
        itemId: i.itemId,
        name: i.item.name,
        rarity: i.item.rarity,
        quantity: i.quantity,
      }));
  }

  async getShopItems() {
    const items = await this.prisma.item.findMany({
      where: {
        OR: [
          { category: 'cosmetic', basePrice: { gt: 0 } },
          { category: 'utility', basePrice: { gt: 0 } },
          { category: 'boost', basePrice: { gt: 0 } },
        ],
      },
      orderBy: { basePrice: 'asc' },
    });
    return items.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      rarity: i.rarity,
      basePrice: toNumber(i.basePrice),
      category: i.category,
      effects: i.effects,
    }));
  }

  async buyShopItem(userId: string, itemId: string) {
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item || !['cosmetic', 'utility', 'boost'].includes(item.category)) {
      throw new NotFoundException('Предмет не найден в магазине');
    }

    const price = toNumber(item.basePrice);
    const tier = await this.premiumService.getActiveTier(userId);
    const discount = this.premiumService.getShopDiscount(tier);
    const finalPrice = Math.floor(price * (1 - discount));

    return this.prisma.$transaction(async (tx) => {
      await this.walletOps.debit(
        {
          userId,
          amount: finalPrice,
          type: TransactionType.PURCHASE,
          description: `Shop purchase: ${item.name}${discount ? ` (-${discount * 100}%)` : ''}`,
        },
        tx,
      );

      const existing = await tx.inventoryItem.findFirst({
        where: { userId, itemId: item.id },
      });
      if (existing) {
        await tx.inventoryItem.update({
          where: { id: existing.id },
          data: { quantity: { increment: 1 } },
        });
      } else {
        await tx.inventoryItem.create({
          data: { userId, itemId: item.id },
        });
      }

      return { item: item.name, price: finalPrice, discount };
    });
  }

  async getListings(query: PaginationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      this.prisma.marketplaceListing.findMany({
        where: { status: ListingStatus.ACTIVE },
        include: {
          item: true,
          seller: { select: { id: true, username: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.marketplaceListing.count({ where: { status: ListingStatus.ACTIVE } }),
    ]);

    return paginate(
      listings.map((l) => ({ ...l, price: toNumber(l.price) })),
      total,
      page,
      limit,
    );
  }

  async createListing(userId: string, dto: CreateListingDto) {
    const inventory = await this.prisma.inventoryItem.findFirst({
      where: { userId, itemId: dto.itemId, quantity: { gte: dto.quantity } },
      include: { item: true },
    });
    if (!inventory) throw new BadRequestException('Insufficient inventory');

    if (!inventory.item.isTradeable) {
      throw new BadRequestException('Item is not tradeable');
    }

    return this.prisma.$transaction(async (tx) => {
      if (inventory.quantity === dto.quantity) {
        await tx.inventoryItem.delete({ where: { id: inventory.id } });
      } else {
        await tx.inventoryItem.update({
          where: { id: inventory.id },
          data: { quantity: { decrement: dto.quantity } },
        });
      }

      return tx.marketplaceListing.create({
        data: {
          sellerId: userId,
          itemId: dto.itemId,
          price: dto.price,
          quantity: dto.quantity,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        include: { item: true },
      });
    });
  }

  async buyListing(userId: string, listingId: string) {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id: listingId },
      include: { item: true, seller: true },
    });
    if (!listing || listing.status !== ListingStatus.ACTIVE) {
      throw new NotFoundException('Listing not found');
    }
    if (listing.sellerId === userId) {
      throw new BadRequestException('Cannot buy your own listing');
    }

    const price = toNumber(listing.price);

    return this.prisma.$transaction(async (tx) => {
      await this.walletOps.debit(
        {
          userId,
          amount: price,
          type: TransactionType.PURCHASE,
          description: `Marketplace purchase: ${listing.item.name}`,
          toUserId: listing.sellerId,
        },
        tx,
      );

      await this.walletOps.credit(
        {
          userId: listing.sellerId,
          amount: price * 0.95,
          type: TransactionType.SALE,
          description: `Marketplace sale: ${listing.item.name}`,
          fromUserId: userId,
          fee: price * 0.05,
        },
        tx,
      );

      const existing = await tx.inventoryItem.findFirst({
        where: { userId, itemId: listing.itemId },
      });
      if (existing) {
        await tx.inventoryItem.update({
          where: { id: existing.id },
          data: { quantity: { increment: listing.quantity } },
        });
      } else {
        await tx.inventoryItem.create({
          data: { userId, itemId: listing.itemId, quantity: listing.quantity },
        });
      }

      await tx.marketplaceListing.update({
        where: { id: listingId },
        data: { status: ListingStatus.SOLD },
      });

      return { item: listing.item, price, quantity: listing.quantity };
    });
  }

  async cancelListing(userId: string, listingId: string) {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id: listingId },
    });
    if (!listing || listing.sellerId !== userId) {
      throw new NotFoundException('Listing not found');
    }
    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException('Listing is not active');
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryItem.findFirst({
        where: { userId, itemId: listing.itemId },
      });
      if (existing) {
        await tx.inventoryItem.update({
          where: { id: existing.id },
          data: { quantity: { increment: listing.quantity } },
        });
      } else {
        await tx.inventoryItem.create({
          data: { userId, itemId: listing.itemId, quantity: listing.quantity },
        });
      }

      return tx.marketplaceListing.update({
        where: { id: listingId },
        data: { status: ListingStatus.CANCELLED },
      });
    });
  }

  async sellToBuyback(userId: string, itemId: string, quantity = 1) {
    const inventory = await this.prisma.inventoryItem.findFirst({
      where: { userId, itemId, quantity: { gte: quantity } },
      include: { item: true },
    });
    if (!inventory) throw new BadRequestException('Предмет не найден в инвентаре');
    if (!inventory.item.isTradeable) {
      throw new BadRequestException('Этот предмет нельзя продать в скупку');
    }

    const unitPrice = Math.floor(toNumber(inventory.item.basePrice) * 0.6);
    if (unitPrice <= 0) throw new BadRequestException('Скупка не принимает этот предмет');
    const total = unitPrice * quantity;

    await this.prisma.$transaction(async (tx) => {
      if (inventory.quantity === quantity) {
        await tx.inventoryItem.delete({ where: { id: inventory.id } });
      } else {
        await tx.inventoryItem.update({
          where: { id: inventory.id },
          data: { quantity: { decrement: quantity } },
        });
      }

      await this.walletOps.credit(
        {
          userId,
          amount: total,
          type: TransactionType.SALE,
          description: `Скупка: ${inventory.item.name} ×${quantity}`,
        },
        tx,
      );
    });

    return { item: inventory.item.name, quantity, amount: total };
  }
}
