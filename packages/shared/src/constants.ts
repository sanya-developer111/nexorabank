export const BRAND = {
  name: 'NEXORA',
  tagline: 'Цифровая финансовая вселенная',
  founded: 2047,
  currency: {
    name: 'Нексиум',
    symbol: 'NEX',
    icon: '◈',
    maxSupply: 1_000_000_000,
    burnRate: 0.02,
    description:
      'Нексиум появился в 2047 году, когда квантовые сети кристаллизовали цифровую ценность в конечное, саморегулируемое средство обмена.',
  },
} as const;

export const ACCOUNT_TYPES = ['MAIN', 'SAVINGS', 'INVESTMENT', 'BUSINESS', 'ESCROW'] as const;
export const USER_ROLES = ['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'] as const;
export const RANKS = [
  'INITIATE',
  'EXPLORER',
  'TRADER',
  'INVESTOR',
  'TYCOON',
  'MAGNATE',
  'LEGEND',
  'SOVEREIGN',
] as const;

export const XP_PER_LEVEL = (level: number) => Math.floor(100 * Math.pow(1.5, level - 1));

export const PRESTIGE_MULTIPLIER = 1.25;
