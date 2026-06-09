import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toNumber } from '../utils/decimal.util';

@Injectable()
export class EconomyEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveMultiplier(): Promise<number> {
    const now = new Date();
    const events = await this.prisma.economyEvent.findMany({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    });
    if (!events.length) return 1;
    return events.reduce((max, e) => Math.max(max, toNumber(e.multiplier)), 1);
  }

  getEventDescription(type: string): string {
    const map: Record<string, string> = {
      BOOM: 'Бум рынка — +множитель к наградам за задания и активности',
      SEASON: 'Сезонное событие — бонус к опыту и NEX',
      INFLATION: 'Инфляция — цены растут',
      DEFLATION: 'Дефляция — цены падают',
      CRASH: 'Обвал — сниженные награды',
      BURN_WEEK: 'Неделя сжигания — бонусы за траты',
      HALVING: 'Халвинг — снижение эмиссии',
    };
    return map[type] ?? 'Экономическое событие';
  }
}
