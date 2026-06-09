import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReferralService {
  constructor(private readonly prisma: PrismaService) {}

  async getReferralInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    const referrals = await this.prisma.user.findMany({
      where: { referredById: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        createdAt: true,
        level: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalEarned = referrals.length * 100;

    return {
      referralCode: user?.referralCode,
      referralBonus: 100,
      totalReferrals: referrals.length,
      totalEarned,
      referrals,
    };
  }

  async getReferralLeaderboard() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        _count: { select: { referrals: true } },
      },
      orderBy: { referrals: { _count: 'desc' } },
      take: 20,
    });

    return users.map((u, i) => ({
      rank: i + 1,
      ...u,
      referralCount: u._count.referrals,
      totalEarned: u._count.referrals * 100,
    }));
  }
}
