import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountType, Prisma, TransactionType, UserRole } from '@prisma/client';
import { paginate, PaginationDto } from '../common/dto/pagination.dto';
import { WalletOperationsService } from '../common/services/wallet-operations.service';
import { sanitizeUser } from '../common/utils/user.util';
import { toNumber } from '../common/utils/decimal.util';
import { EconomyService } from '../economy/economy.service';
import { PremiumService } from '../premium/premium.service';
import { FraudDetectionService } from '../security/fraud-detection.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdjustBalanceDto,
  AdjustUserAccountDto,
  AdjustUserLevelDto,
  BanUserDto,
  CreateEconomyEventDto,
  CreateQuestDto,
  GrantPremiumDto,
  UpdateSettingsDto,
  UpdateUserRoleDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletOps: WalletOperationsService,
    private readonly economyService: EconomyService,
    private readonly fraudService: FraudDetectionService,
    private readonly premiumService: PremiumService,
  ) {}

  private async resolveUserId(userId?: string, username?: string) {
    if (userId) return userId;
    if (username) {
      const clean = username.replace(/^@/, '').trim();
      const user = await this.prisma.user.findUnique({ where: { username: clean } });
      if (!user) throw new NotFoundException(`User @${clean} not found`);
      return user.id;
    }
    throw new BadRequestException('userId or username required');
  }

  async getDashboard() {
    const [userCount, bannedCount, activeQuests, activeListings, openContracts, fraudAlerts] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { isBanned: true } }),
        this.prisma.quest.count({ where: { isActive: true } }),
        this.prisma.marketplaceListing.count({ where: { status: 'ACTIVE' } }),
        this.prisma.contract.count({ where: { status: 'OPEN' } }),
        this.prisma.fraudAlert.count({ where: { resolved: false } }),
      ]);

    const metrics = await this.economyService.getMetrics();

    return {
      users: { total: userCount, banned: bannedCount },
      quests: { active: activeQuests },
      marketplace: { activeListings },
      contracts: { open: openContracts },
      security: { unresolvedAlerts: fraudAlerts },
      economy: metrics,
    };
  }

  async getEconomy() {
    return this.economyService.getMetrics();
  }

  async getUsers(query: PaginationDto, search?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { accounts: { select: { type: true, balance: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(
      users.map((u) => sanitizeUser(u)),
      total,
      page,
      limit,
    );
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        accounts: true,
        fraudAlerts: { take: 10, orderBy: { createdAt: 'desc' } },
        activityLogs: { take: 20, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return sanitizeUser(user);
  }

  async banUser(userId: string, dto: BanUserDto) {
    return this.fraudService.flagUser(userId, dto.reason);
  }

  async unbanUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isBanned: false, banReason: null },
    });
  }

  async updateUserRole(userId: string, dto: UpdateUserRoleDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { role: dto.role },
    });
    return sanitizeUser(user);
  }

  async grantPremium(dto: GrantPremiumDto, adminId: string) {
    const userId = await this.resolveUserId(dto.userId, dto.username);
    return this.premiumService.grantPremium(userId, dto.plan, dto.durationDays, adminId);
  }

  async revokePremium(userId: string, adminId: string) {
    return this.premiumService.revokePremium(userId, adminId);
  }

  async adjustBalance(dto: AdjustBalanceDto) {
    if (dto.amount > 0) {
      await this.walletOps.credit({
        userId: dto.userId,
        amount: dto.amount,
        type: TransactionType.DEPOSIT,
        description: `Admin adjustment: ${dto.reason}`,
      });
    } else {
      await this.walletOps.debit({
        userId: dto.userId,
        amount: Math.abs(dto.amount),
        type: TransactionType.WITHDRAWAL,
        description: `Admin adjustment: ${dto.reason}`,
      });
    }
    return { message: 'Balance adjusted', amount: dto.amount };
  }

  async getQuests() {
    return this.prisma.quest.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createQuest(dto: CreateQuestDto) {
    return this.prisma.quest.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        description: dto.description,
        period: dto.period as 'DAILY' | 'WEEKLY' | 'SEASONAL' | 'SPECIAL',
        target: dto.target,
        action: dto.action,
        nexReward: dto.nexReward,
        xpReward: dto.xpReward,
      },
    });
  }

  async toggleQuest(questId: string, isActive: boolean) {
    return this.prisma.quest.update({
      where: { id: questId },
      data: { isActive },
    });
  }

  async getEconomyEvents() {
    return this.prisma.economyEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  }

  async createEconomyEvent(dto: CreateEconomyEventDto) {
    return this.prisma.economyEvent.create({
      data: {
        type: dto.type,
        title: dto.title,
        description: dto.description,
        multiplier: dto.multiplier,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
      },
    });
  }

  async deleteEconomyEvent(eventId: string) {
    const event = await this.prisma.economyEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Событие не найдено');
    await this.prisma.economyEvent.delete({ where: { id: eventId } });
    return { deleted: true };
  }

  async adjustUserLevel(userId: string, dto: AdjustUserLevelDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        level: dto.level,
        ...(dto.xp !== undefined ? { xp: dto.xp } : {}),
      },
    });
    return sanitizeUser(user);
  }

  async adjustUserAccount(dto: AdjustUserAccountDto) {
    const accountType = dto.accountType as AccountType;
    if (dto.amount > 0) {
      await this.walletOps.credit({
        userId: dto.userId,
        accountType,
        amount: dto.amount,
        type: TransactionType.DEPOSIT,
        description: `Админ: ${dto.reason}`,
      });
    } else {
      await this.walletOps.debit({
        userId: dto.userId,
        accountType,
        amount: Math.abs(dto.amount),
        type: TransactionType.WITHDRAWAL,
        description: `Админ: ${dto.reason}`,
      });
    }
    return { message: 'Счёт обновлён', amount: dto.amount };
  }

  async deleteUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Пользователь не найден');
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Нельзя удалить супер-администратора');
    }
    if (userId === adminId) {
      throw new BadRequestException('Нельзя удалить самого себя');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.playerTrade.deleteMany({
        where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
      });
      await tx.paymentQr.deleteMany({ where: { creatorId: userId } });
      await tx.videoWatch.deleteMany({ where: { userId } });
      await tx.tournamentEntry.deleteMany({ where: { userId } });
      await tx.premiumSubscription.deleteMany({ where: { userId } });
      await tx.battlePassProgress.deleteMany({ where: { userId } });
      await tx.userQuest.deleteMany({ where: { userId } });
      await tx.userAchievement.deleteMany({ where: { userId } });
      await tx.inventoryItem.deleteMany({ where: { userId } });
      await tx.portfolioHolding.deleteMany({ where: { userId } });
      await tx.marketplaceListing.deleteMany({ where: { sellerId: userId } });
      await tx.auctionBid.deleteMany({ where: { bidderId: userId } });
      await tx.auction.deleteMany({ where: { sellerId: userId } });
      await tx.friendship.deleteMany({
        where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      });
      await tx.message.deleteMany({
        where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      });
      await tx.chatMessage.deleteMany({ where: { userId } });
      await tx.clanMember.deleteMany({ where: { userId } });
      await tx.corporationMember.deleteMany({ where: { userId } });
      await tx.business.deleteMany({ where: { ownerId: userId } });
      await tx.transaction.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });
      await tx.activityLog.deleteMany({ where: { userId } });
      await tx.fraudAlert.deleteMany({ where: { userId } });
      await tx.user.updateMany({ where: { referredById: userId }, data: { referredById: null } });
      await tx.user.delete({ where: { id: userId } });
      await tx.activityLog.create({
        data: {
          userId: adminId,
          action: 'ADMIN_DELETE_USER',
          entity: 'user',
          entityId: userId,
          metadata: { username: user.username },
        },
      });
    });

    return { deleted: true, username: user.username };
  }

  async burnCurrency(amount: number, reason?: string) {
    return this.economyService.burnCurrency(amount, reason);
  }

  async getMarketListings(query: PaginationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      this.prisma.marketplaceListing.findMany({
        include: { item: true, seller: { select: { username: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.marketplaceListing.count(),
    ]);

    return paginate(listings, total, page, limit);
  }

  async getClans(query: PaginationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [clans, total] = await Promise.all([
      this.prisma.clan.findMany({
        include: { members: { include: { user: { select: { username: true } } } } },
        orderBy: { level: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.clan.count(),
    ]);

    return paginate(
      clans.map((c) => ({ ...c, treasury: toNumber(c.treasury) })),
      total,
      page,
      limit,
    );
  }

  async getLogs(query: PaginationDto, userId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where = userId ? { userId } : {};

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return paginate(logs, total, page, limit);
  }

  async getFraudAlerts() {
    return this.fraudService.getAlerts(undefined, false);
  }

  async resolveFraudAlert(alertId: string) {
    return this.fraudService.resolveAlert(alertId);
  }

  async getSettings() {
    let settings = await this.prisma.platformSettings.findUnique({
      where: { id: 'platform' },
    });
    if (!settings) {
      settings = await this.prisma.platformSettings.create({
        data: { id: 'platform', data: {} },
      });
    }
    return settings;
  }

  async updateSettings(dto: UpdateSettingsDto) {
    const current = await this.getSettings();
    const merged = { ...(current.data as object), ...dto.data };

    return this.prisma.platformSettings.update({
      where: { id: 'platform' },
      data: { data: merged as Prisma.InputJsonValue },
    });
  }
}
