import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountType, TransactionType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import * as QRCode from 'qrcode';
import { WalletOperationsService } from '../common/services/wallet-operations.service';
import { toNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletOps: WalletOperationsService,
    private readonly config: ConfigService,
  ) {}

  private getWebBase() {
    return (
      this.config.get<string>('WEB_URL') ||
      this.config.get<string>('NEXT_PUBLIC_WEB_URL') ||
      'http://localhost:3000'
    );
  }

  async createQr(userId: string, amount: number, description?: string) {
    if (amount <= 0) throw new BadRequestException('Сумма должна быть больше 0');
    if (amount > 1_000_000) throw new BadRequestException('Максимум 1 000 000 NEX');

    const code = `NEX-${randomBytes(6).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const qr = await this.prisma.paymentQr.create({
      data: { creatorId: userId, code, amount, description, expiresAt },
    });

    const qrPayload = JSON.stringify({
      type: 'NEXORA_PAY',
      code: qr.code,
      amount: toNumber(qr.amount),
    });
    const qrImage = await QRCode.toDataURL(qrPayload, {
      width: 280,
      margin: 2,
      color: { dark: '#1a1d23', light: '#e8ebe6' },
    });

    return {
      id: qr.id,
      code: qr.code,
      amount: toNumber(qr.amount),
      description: qr.description,
      expiresAt: qr.expiresAt.toISOString(),
      payUrl: `/wallet?pay=${qr.code}`,
      qrImage,
      qrPayload,
    };
  }

  async getQrImage(code: string) {
    const qr = await this.prisma.paymentQr.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (!qr || qr.isUsed || qr.expiresAt < new Date()) {
      throw new NotFoundException('QR-код не найден или истёк');
    }
    const qrPayload = JSON.stringify({ type: 'NEXORA_PAY', code: qr.code, amount: toNumber(qr.amount) });
    const qrImage = await QRCode.toDataURL(qrPayload, { width: 280, margin: 2 });
    return { qrImage, code: qr.code, amount: toNumber(qr.amount) };
  }

  async getMyQrs(userId: string) {
    const qrs = await this.prisma.paymentQr.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return qrs.map((q) => ({
      id: q.id,
      code: q.code,
      amount: toNumber(q.amount),
      description: q.description,
      isUsed: q.isUsed,
      expiresAt: q.expiresAt.toISOString(),
      createdAt: q.createdAt.toISOString(),
    }));
  }

  async payByCode(payerId: string, rawCode: string) {
    let code = rawCode.trim();
    try {
      const parsed = JSON.parse(rawCode);
      if (parsed?.code) code = String(parsed.code);
    } catch {
      // plain NEX- code
    }
    code = code.toUpperCase();

    const qr = await this.prisma.paymentQr.findUnique({
      where: { code },
      include: { creator: { select: { id: true, username: true, displayName: true } } },
    });
    if (!qr) throw new NotFoundException('QR-код не найден');
    if (qr.isUsed) throw new BadRequestException('QR-код уже использован');
    if (qr.expiresAt < new Date()) throw new BadRequestException('QR-код истёк');
    if (qr.creatorId === payerId) throw new BadRequestException('Нельзя оплатить свой QR-код');

    const amount = toNumber(qr.amount);

    await this.prisma.$transaction(async (tx) => {
      await this.walletOps.debit(
        {
          userId: payerId,
          accountType: AccountType.MAIN,
          amount,
          type: TransactionType.TRANSFER,
          description: qr.description ?? `Оплата по QR ${qr.code}`,
          toUserId: qr.creatorId,
        },
        tx,
      );
      await this.walletOps.credit(
        {
          userId: qr.creatorId,
          accountType: AccountType.MAIN,
          amount,
          type: TransactionType.TRANSFER,
          description: qr.description ?? `Получено по QR ${qr.code}`,
          fromUserId: payerId,
        },
        tx,
      );
      await tx.paymentQr.update({
        where: { id: qr.id },
        data: { isUsed: true, usedById: payerId, usedAt: new Date() },
      });
    });

    return {
      amount,
      to: qr.creator.username,
      toDisplayName: qr.creator.displayName,
      description: qr.description,
    };
  }

  async lookupCode(code: string) {
    const qr = await this.prisma.paymentQr.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: { creator: { select: { username: true, displayName: true } } },
    });
    if (!qr || qr.isUsed || qr.expiresAt < new Date()) return null;
    return {
      amount: toNumber(qr.amount),
      description: qr.description,
      creator: qr.creator.username,
      creatorName: qr.creator.displayName,
      expiresAt: qr.expiresAt.toISOString(),
    };
  }
}
