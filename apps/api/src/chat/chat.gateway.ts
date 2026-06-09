import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PremiumService } from '../premium/premium.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly onlineUsers = new Map<string, string>();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly premiumService: PremiumService,
  ) {}

  private formatChatUser(user: {
    username: string;
    displayName: string;
    avatar?: string | null;
    avatarFrame?: string | null;
    title?: string | null;
    isPremium?: boolean;
    premiumUntil?: Date | null;
  }) {
    const tier = user.isPremium && user.premiumUntil && user.premiumUntil > new Date()
      ? (user.avatarFrame === 'gold' ? 'elite' : user.avatarFrame === 'purple' ? 'pro' : 'starter')
      : null;
    return this.premiumService.formatPublicUser(user, tier as 'starter' | 'pro' | 'elite' | null);
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.config.get('JWT_SECRET'),
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.isBanned) {
        client.disconnect();
        return;
      }

      client.userId = user.id;
      client.username = user.username;
      this.onlineUsers.set(user.id, client.id);
      client.join('global');

      this.server.to('global').emit('user:online', { userId: user.id, username: user.username });
      this.logger.log(`User ${user.username} connected`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.onlineUsers.delete(client.userId);
      this.server.to('global').emit('user:offline', { userId: client.userId });
    }
  }

  @SubscribeMessage('chat:global')
  async handleGlobalMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { content: string },
  ) {
    if (!client.userId || !data.content?.trim()) return;

    const room = await this.prisma.chatRoom.findFirst({ where: { isGlobal: true } });
    if (!room) return { error: 'Global chat room not found' };

    const message = await this.prisma.chatMessage.create({
      data: { roomId: room.id, userId: client.userId, content: data.content.trim() },
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
    });

    this.server.to('global').emit('chat:message', {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      user: this.formatChatUser(message.user),
      room: 'global',
    });

    return { success: true, message };
  }

  @SubscribeMessage('dm:send')
  async handleDirectMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { receiverId: string; content: string },
  ) {
    if (!client.userId || !data.receiverId || !data.content?.trim()) return;

    const message = await this.prisma.message.create({
      data: {
        senderId: client.userId,
        receiverId: data.receiverId,
        content: data.content.trim(),
      },
      include: {
        sender: { select: { username: true, displayName: true, avatar: true } },
      },
    });

    const receiverSocketId = this.onlineUsers.get(data.receiverId);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('dm:message', message);
    }

    return { success: true, message };
  }

  @SubscribeMessage('dm:join')
  handleJoinDm(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId: string },
  ) {
    if (!client.userId) return;
    const roomId = [client.userId, data.userId].sort().join(':');
    client.join(`dm:${roomId}`);
    return { room: `dm:${roomId}` };
  }

  @SubscribeMessage('chat:history')
  async getHistory(
    @MessageBody() data: { roomSlug?: string; limit?: number },
  ) {
    const room = await this.prisma.chatRoom.findFirst({
      where: data.roomSlug ? { slug: data.roomSlug } : { isGlobal: true },
    });
    if (!room) return [];

    return this.prisma.chatMessage.findMany({
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
      orderBy: { createdAt: 'desc' },
      take: data.limit ?? 50,
    }).then((msgs) =>
      msgs.map((m) => ({
        ...m,
        user: this.formatChatUser(m.user),
      })),
    );
  }
}
