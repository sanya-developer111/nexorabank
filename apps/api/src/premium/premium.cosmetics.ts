import type { PremiumTier } from './premium.service';

export const PREMIUM_TITLES: Record<string, string> = {
  starter: 'NEXORA Plus',
  pro: 'NEXORA Pro',
  elite: 'NEXORA Elite',
};

export const PREMIUM_FRAMES: Record<string, string> = {
  starter: 'cyan',
  pro: 'purple',
  elite: 'gold',
};

export function isPremiumTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return Object.values(PREMIUM_TITLES).includes(title);
}

export function cosmeticsForTier(tier: PremiumTier) {
  if (!tier) return { title: null as string | null, avatarFrame: null as string | null };
  return {
    title: PREMIUM_TITLES[tier] ?? null,
    avatarFrame: PREMIUM_FRAMES[tier] ?? null,
  };
}

export function tierFromUser(user: {
  isPremium?: boolean;
  premiumUntil?: Date | string | null;
  avatarFrame?: string | null;
}): PremiumTier {
  const until = user.premiumUntil ? new Date(user.premiumUntil) : null;
  if (!user.isPremium || !until || until <= new Date()) return null;
  if (user.avatarFrame === 'gold') return 'elite';
  if (user.avatarFrame === 'purple') return 'pro';
  if (user.avatarFrame === 'cyan') return 'starter';
  return 'starter';
}
