import { Rank } from '@prisma/client';
import { rankFromLevel, xpForLevel, levelFromXp } from '@nexora/shared';
import { PrismaService } from '../../prisma/prisma.service';

export function xpInCurrentLevel(totalXp: number) {
  const level = levelFromXp(totalXp);
  let remaining = totalXp;
  for (let l = 1; l < level; l++) {
    remaining -= xpForLevel(l);
  }
  return { level, current: remaining, needed: xpForLevel(level) };
}

export async function syncUserLevel(prisma: PrismaService, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const level = levelFromXp(user.xp);
  const rank = rankFromLevel(level, user.prestige) as Rank;

  return prisma.user.update({
    where: { id: userId },
    data: { level, rank },
  });
}
