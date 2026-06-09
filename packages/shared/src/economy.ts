import { BRAND } from './constants';

export function calculateInflation(supply: number, burned: number, velocity: number): number {
  const circulating = supply - burned;
  if (circulating <= 0) return 0;
  const scarcity = 1 - circulating / BRAND.currency.maxSupply;
  return Math.max(-0.05, Math.min(0.15, velocity * 0.001 - scarcity * 0.02));
}

export function calculateDeflation(burnAmount: number, totalSupply: number): number {
  if (totalSupply <= 0) return 0;
  return burnAmount / totalSupply;
}

export function applyCashback(amount: number, isPremium: boolean, streak: number): number {
  const baseRate = isPremium ? 0.05 : 0.02;
  const streakBonus = Math.min(streak * 0.001, 0.03);
  return amount * (baseRate + streakBonus);
}

export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return level;
}

export function xpInCurrentLevel(totalXp: number) {
  const level = levelFromXp(totalXp);
  let remaining = totalXp;
  for (let l = 1; l < level; l++) {
    remaining -= xpForLevel(l);
  }
  return { level, current: remaining, needed: xpForLevel(level) };
}

export function rankFromLevel(level: number, prestige: number): string {
  const effective = level + prestige * 50;
  if (effective >= 200) return 'SOVEREIGN';
  if (effective >= 150) return 'LEGEND';
  if (effective >= 100) return 'MAGNATE';
  if (effective >= 75) return 'TYCOON';
  if (effective >= 50) return 'INVESTOR';
  if (effective >= 30) return 'TRADER';
  if (effective >= 15) return 'EXPLORER';
  return 'INITIATE';
}
