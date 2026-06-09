import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccountType, Prisma, TransactionType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { generateReferralCode, sanitizeUser } from '../common/utils/user.util';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { QuestsService } from '../quests/quests.service';
import { AchievementsService } from '../achievements/achievements.service';
import { syncUserLevel } from '../common/utils/level.util';

const STARTING_MAIN_BALANCE = 1000;
const STARTING_SAVINGS_BALANCE = 500;
const REFERRAL_BONUS = 100;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly questsService: QuestsService,
    private readonly achievementsService: AchievementsService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) {
      throw new ConflictException('Email or username already exists');
    }

    let referrerId: string | undefined;
    if (dto.referralCode) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: dto.referralCode },
      });
      if (!referrer) throw new BadRequestException('Invalid referral code');
      referrerId = referrer.id;
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const referralCode = generateReferralCode(dto.username);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          username: dto.username,
          passwordHash,
          displayName: dto.displayName,
          referralCode,
          referredById: referrerId,
        },
      });

      await tx.account.createMany({
        data: [
          { userId: created.id, type: AccountType.MAIN, balance: STARTING_MAIN_BALANCE },
          { userId: created.id, type: AccountType.SAVINGS, balance: STARTING_SAVINGS_BALANCE },
          { userId: created.id, type: AccountType.INVESTMENT, balance: 0 },
          { userId: created.id, type: AccountType.BUSINESS, balance: 0 },
          { userId: created.id, type: AccountType.ESCROW, balance: 0 },
        ],
      });

      const mainAccount = await tx.account.findUnique({
        where: { userId_type: { userId: created.id, type: AccountType.MAIN } },
      });

      if (mainAccount) {
        await tx.transaction.create({
          data: {
            userId: created.id,
            accountId: mainAccount.id,
            type: TransactionType.DEPOSIT,
            amount: STARTING_MAIN_BALANCE,
            description: 'Welcome bonus - MAIN account',
          },
        });
      }

      const savingsAccount = await tx.account.findUnique({
        where: { userId_type: { userId: created.id, type: AccountType.SAVINGS } },
      });

      if (savingsAccount) {
        await tx.transaction.create({
          data: {
            userId: created.id,
            accountId: savingsAccount.id,
            type: TransactionType.DEPOSIT,
            amount: STARTING_SAVINGS_BALANCE,
            description: 'Welcome bonus - SAVINGS account',
          },
        });
      }

      if (referrerId) {
        const referrerMain = await tx.account.findUnique({
          where: { userId_type: { userId: referrerId, type: AccountType.MAIN } },
        });
        const newUserMain = await tx.account.findUnique({
          where: { userId_type: { userId: created.id, type: AccountType.MAIN } },
        });

        if (referrerMain && newUserMain) {
          await tx.account.update({
            where: { id: referrerMain.id },
            data: { balance: { increment: REFERRAL_BONUS } },
          });
          await tx.account.update({
            where: { id: newUserMain.id },
            data: { balance: { increment: REFERRAL_BONUS } },
          });
          await tx.transaction.createMany({
            data: [
              {
                userId: referrerId,
                accountId: referrerMain.id,
                type: TransactionType.REFERRAL,
                amount: REFERRAL_BONUS,
                description: `Referral bonus for ${dto.username}`,
                toUserId: created.id,
              },
              {
                userId: created.id,
                accountId: newUserMain.id,
                type: TransactionType.REFERRAL,
                amount: REFERRAL_BONUS,
                description: 'Referral signup bonus',
                fromUserId: referrerId,
              },
            ],
          });
        }
      }

      return created;
    });

    const tokens = await this.generateTokens(user);
    await this.achievementsService.checkAndUnlock(user.id, 'first-steps', true);
    await syncUserLevel(this.prisma, user.id);
    return { user: sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (user.isBanned) throw new UnauthorizedException('Account is banned');

    if (user.twoFactorEnabled) {
      if (!dto.twoFactorCode) {
        throw new UnauthorizedException('2FA code required');
      }
      const valid2fa = authenticator.verify({
        token: dto.twoFactorCode,
        secret: user.twoFactorSecret!,
      });
      if (!valid2fa) throw new UnauthorizedException('Invalid 2FA code');
    }

    const now = new Date();
    const lastLogin = user.lastLoginAt;
    let loginStreak = user.loginStreak;
    if (lastLogin) {
      const daysSince = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
      loginStreak = daysSince === 1 ? loginStreak + 1 : daysSince === 0 ? loginStreak : 1;
    } else {
      loginStreak = 1;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: now, loginStreak },
    });

    await this.questsService.trackProgress(user.id, 'login');
    await syncUserLevel(this.prisma, user.id);

    const tokens = await this.generateTokens(user);
    return { user: sanitizeUser({ ...user, lastLoginAt: now, loginStreak }), ...tokens };
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    const tokens = await this.generateTokens(stored.user);
    return tokens;
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    return { message: 'Logged out' };
  }

  async setup2FA(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (user.twoFactorEnabled) throw new BadRequestException('2FA already enabled');

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, 'NEXORA', secret);
    const qrCode = await QRCode.toDataURL(otpauth);

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return { secret, qrCode };
  }

  async enable2FA(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) throw new BadRequestException('Setup 2FA first');

    const valid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
    if (!valid) throw new BadRequestException('Invalid 2FA code');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
    return { message: '2FA enabled' };
  }

  async disable2FA(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorEnabled) throw new BadRequestException('2FA not enabled');

    const valid = authenticator.verify({ token: code, secret: user.twoFactorSecret! });
    if (!valid) throw new BadRequestException('Invalid 2FA code');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    return { message: '2FA disabled' };
  }

  private async generateTokens(user: { id: string; email: string; role: UserRole }) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '7d'),
    });

    const refreshToken = uuidv4();
    const expiresIn = this.config.get('JWT_REFRESH_EXPIRES_IN', '30d');
    const expiresAt = new Date();
    const days = parseInt(expiresIn, 10) || 30;
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    return { accessToken, refreshToken };
  }
}
