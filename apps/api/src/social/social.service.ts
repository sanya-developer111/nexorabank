import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ClanRole, FriendshipStatus } from '@prisma/client';
import { paginate, PaginationDto } from '../common/dto/pagination.dto';
import { toNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';
import { tierFromUser } from '../premium/premium.cosmetics';
import { PremiumService } from '../premium/premium.service';
import { CreateClanDto, CreateCorporationDto, SendFriendRequestDto, SendMessageDto } from './dto/social.dto';

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly premiumService: PremiumService,
  ) {}

  async sendFriendRequest(senderId: string, dto: SendFriendRequestDto) {
    let receiverId = dto.userId;
    if (dto.username) {
      const clean = dto.username.replace(/^@/, '').trim();
      const user = await this.prisma.user.findUnique({ where: { username: clean } });
      if (!user) throw new NotFoundException('User not found');
      receiverId = user.id;
    }
    if (!receiverId) throw new BadRequestException('userId or username required');
    if (senderId === receiverId) throw new BadRequestException('Cannot friend yourself');

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    });
    if (existing) throw new BadRequestException('Friendship already exists');

    return this.prisma.friendship.create({
      data: { senderId, receiverId, status: FriendshipStatus.PENDING },
    });
  }

  async getFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: { select: { id: true, username: true, displayName: true, level: true } },
        receiver: { select: { id: true, username: true, displayName: true, level: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return friendships.map((f) => {
      const friend = f.senderId === userId ? f.receiver : f.sender;
      return {
        id: f.id,
        status: f.status,
        user: friend,
      };
    });
  }

  async acceptFriendRequest(userId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship || friendship.receiverId !== userId) {
      throw new NotFoundException('Request not found');
    }

    return this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: FriendshipStatus.ACCEPTED },
    });
  }

  async getPendingRequests(userId: string) {
    return this.prisma.friendship.findMany({
      where: { receiverId: userId, status: FriendshipStatus.PENDING },
      include: { sender: { select: { id: true, username: true, displayName: true, avatar: true } } },
    });
  }

  async sendMessage(senderId: string, dto: SendMessageDto) {
    let receiverId = dto.receiverId;
    if (dto.receiverUsername) {
      const clean = dto.receiverUsername.replace(/^@/, '').trim();
      const user = await this.prisma.user.findUnique({ where: { username: clean } });
      if (!user) throw new NotFoundException('User not found');
      receiverId = user.id;
    }
    if (!receiverId) throw new BadRequestException('receiverId or receiverUsername required');

    const receiver = await this.prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) throw new NotFoundException('User not found');

    return this.prisma.message.create({
      data: { senderId, receiverId, content: dto.content },
    });
  }

  async getInbox(userId: string) {
    const messages = await this.prisma.message.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      include: {
        sender: { select: { username: true } },
        receiver: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return messages.map((m) => ({
      id: m.id,
      content: m.content,
      isRead: m.isRead,
      createdAt: m.createdAt.toISOString(),
      sender: { username: m.sender.username },
      receiver: { username: m.receiver.username },
    }));
  }

  async getChatHistory(roomSlug = 'global') {
    const room = await this.prisma.chatRoom.findFirst({
      where: roomSlug === 'global' ? { isGlobal: true } : { slug: roomSlug },
    });
    if (!room) return [];

    const messages = await this.prisma.chatMessage.findMany({
      where: { roomId: room.id },
      include: {
        user: {
          select: {
            username: true,
            displayName: true,
            avatar: true,
            avatarFrame: true,
            title: true,
            isPremium: true,
            premiumUntil: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return messages.map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      user: this.premiumService.formatPublicUser(m.user, tierFromUser(m.user)),
    }));
  }

  async getMessages(userId: string, otherUserId: string, query: PaginationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.message.count({
        where: {
          OR: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId },
          ],
        },
      }),
    ]);

    await this.prisma.message.updateMany({
      where: { senderId: otherUserId, receiverId: userId, isRead: false },
      data: { isRead: true },
    });

    return paginate(messages.reverse(), total, page, limit);
  }

  async createClan(userId: string, dto: CreateClanDto) {
    const existing = await this.prisma.clanMember.findFirst({ where: { userId } });
    if (existing) throw new BadRequestException('Already in a clan');

    return this.prisma.$transaction(async (tx) => {
      const clan = await tx.clan.create({
        data: { name: dto.name, tag: dto.tag.toUpperCase(), description: dto.description },
      });
      await tx.clanMember.create({
        data: { clanId: clan.id, userId, role: ClanRole.LEADER },
      });
      return clan;
    });
  }

  async joinClan(userId: string, clanId: string) {
    const existing = await this.prisma.clanMember.findFirst({ where: { userId } });
    if (existing) throw new BadRequestException('Already in a clan');

    const clan = await this.prisma.clan.findUnique({ where: { id: clanId } });
    if (!clan) throw new NotFoundException('Clan not found');

    return this.prisma.clanMember.create({
      data: { clanId, userId, role: ClanRole.MEMBER },
    });
  }

  async getClans(query: PaginationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [clans, total] = await Promise.all([
      this.prisma.clan.findMany({
        include: { members: { select: { id: true } }, _count: { select: { members: true } } },
        orderBy: { level: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.clan.count(),
    ]);

    return paginate(
      clans.map((c) => ({ ...c, treasury: toNumber(c.treasury), memberCount: c._count.members })),
      total,
      page,
      limit,
    );
  }

  async createCorporation(userId: string, dto: CreateCorporationDto) {
    const existing = await this.prisma.corporationMember.findFirst({ where: { userId } });
    if (existing) throw new BadRequestException('Already in a corporation');

    return this.prisma.$transaction(async (tx) => {
      const corp = await tx.corporation.create({
        data: { name: dto.name, ticker: dto.ticker.toUpperCase(), description: dto.description },
      });
      await tx.corporationMember.create({
        data: { corporationId: corp.id, userId, role: 'ceo', shares: 100 },
      });
      return corp;
    });
  }

  async getCorporations(query: PaginationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [corps, total] = await Promise.all([
      this.prisma.corporation.findMany({
        include: { _count: { select: { members: true } } },
        orderBy: { valuation: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.corporation.count(),
    ]);

    return paginate(
      corps.map((c) => ({
        ...c,
        valuation: toNumber(c.valuation),
        revenue: toNumber(c.revenue),
        memberCount: c._count.members,
      })),
      total,
      page,
      limit,
    );
  }
}
