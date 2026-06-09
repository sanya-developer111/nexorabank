import { Injectable, NotFoundException } from '@nestjs/common';
import { FriendshipStatus } from '@prisma/client';
import { paginate, PaginationDto } from '../common/dto/pagination.dto';
import { sanitizeUser } from '../common/utils/user.util';
import { syncUserLevel } from '../common/utils/level.util';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    await syncUserLevel(this.prisma, userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        accounts: { select: { type: true, balance: true, currency: true } },
        achievements: { include: { achievement: true }, take: 5, orderBy: { unlockedAt: 'desc' } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return sanitizeUser(user);
  }

  async getProfileByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        accounts: { select: { balance: true } },
        achievements: { include: { achievement: true }, orderBy: { unlockedAt: 'desc' }, take: 20 },
        inventory: { include: { item: true }, take: 30 },
        portfolio: { include: { asset: { select: { price: true } } } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const { accounts, achievements, inventory, portfolio, ...profile } = user;
    const totalWealth = accounts.reduce((s, a) => s + Number(a.balance), 0);
    const investments = portfolio.reduce(
      (s, h) => s + Number(h.quantity) * Number(h.asset.price),
      0,
    );

    return {
      profile: {
        username: profile.username,
        displayName: profile.displayName,
        avatar: profile.avatar ?? undefined,
        avatarFrame: profile.avatarFrame ?? undefined,
        level: profile.level,
        xp: profile.xp,
        rank: profile.rank,
        prestige: profile.prestige,
        title: profile.title ?? undefined,
        isPremium: profile.isPremium,
        bio: profile.bio ?? undefined,
        createdAt: profile.createdAt.toISOString(),
      },
      stats: {
        totalWealth,
        investments,
        achievements: achievements.length,
      },
      achievements: achievements.map((a) => ({
        name: a.achievement.name,
        icon: a.achievement.icon,
        unlockedAt: a.unlockedAt.toISOString(),
      })),
      inventory: inventory.map((i) => ({
        name: i.item.name,
        rarity: i.item.rarity,
        quantity: i.quantity,
      })),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    return sanitizeUser(user);
  }

  async getFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatar: true, level: true, rank: true } },
        receiver: { select: { id: true, username: true, displayName: true, avatar: true, level: true, rank: true } },
      },
    });

    return friendships.map((f) => {
      const friend = f.senderId === userId ? f.receiver : f.sender;
      return { ...friend, friendsSince: f.updatedAt };
    });
  }

  async getLeaderboard(query: PaginationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { isBanned: false },
        orderBy: [{ level: 'desc' }, { xp: 'desc' }],
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
          level: true,
          xp: true,
          rank: true,
          prestige: true,
          isPremium: true,
        },
      }),
      this.prisma.user.count({ where: { isBanned: false } }),
    ]);

    return paginate(
      users.map((u, i) => ({ ...u, position: skip + i + 1 })),
      total,
      page,
      limit,
    );
  }
}
