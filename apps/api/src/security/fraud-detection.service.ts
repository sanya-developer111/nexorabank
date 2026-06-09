import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FraudDetectionService {
  constructor(private readonly prisma: PrismaService) {}

  async checkTransaction(
    userId: string,
    amount: number,
    type: string,
    ipAddress?: string,
  ): Promise<{ suspicious: boolean; reason?: string }> {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentCount = await this.prisma.transaction.count({
      where: { userId, createdAt: { gte: hourAgo } },
    });

    if (recentCount > 50) {
      await this.createAlert(userId, 'HIGH_FREQUENCY', 'high', {
        count: recentCount,
        type,
      });
      return { suspicious: true, reason: 'High transaction frequency' };
    }

    if (Math.abs(amount) > 100000) {
      await this.createAlert(userId, 'LARGE_AMOUNT', 'medium', { amount, type });
      return { suspicious: true, reason: 'Unusually large transaction' };
    }

    if (ipAddress) {
      const ipCount = await this.prisma.activityLog.count({
        where: { ipAddress, createdAt: { gte: hourAgo } },
      });
      if (ipCount > 100) {
        await this.createAlert(userId, 'SUSPICIOUS_IP', 'high', { ipAddress, count: ipCount });
        return { suspicious: true, reason: 'Suspicious IP activity' };
      }
    }

    return { suspicious: false };
  }

  async createAlert(
    userId: string,
    type: string,
    severity: string,
    details?: Record<string, unknown>,
  ) {
    return this.prisma.fraudAlert.create({
      data: { userId, type, severity, details: details as Prisma.InputJsonValue },
    });
  }

  async getAlerts(userId?: string, resolved?: boolean) {
    return this.prisma.fraudAlert.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(resolved !== undefined ? { resolved } : {}),
      },
      include: { user: { select: { username: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async resolveAlert(alertId: string) {
    return this.prisma.fraudAlert.update({
      where: { id: alertId },
      data: { resolved: true },
    });
  }

  async flagUser(userId: string, reason: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isBanned: true, banReason: reason },
    });
    await this.createAlert(userId, 'ACCOUNT_BANNED', 'critical', { reason });
    return { message: 'User banned', userId };
  }
}
