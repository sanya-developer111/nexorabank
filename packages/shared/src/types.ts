export type AccountType = 'MAIN' | 'SAVINGS' | 'INVESTMENT' | 'BUSINESS' | 'ESCROW';
export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
export type Rank = 'INITIATE' | 'EXPLORER' | 'TRADER' | 'INVESTOR' | 'TYCOON' | 'MAGNATE' | 'LEGEND' | 'SOVEREIGN';
export type QuestPeriod = 'DAILY' | 'WEEKLY' | 'SEASONAL' | 'SPECIAL';
export type ItemRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';
export type AssetType = 'STOCK' | 'INDEX' | 'CRYPTO' | 'NEXORA_ASSET';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  avatarFrame?: string;
  bio?: string;
  level: number;
  xp: number;
  rank: Rank;
  prestige: number;
  title?: string;
  isPremium: boolean;
  createdAt: string;
}

export interface WalletSummary {
  totalBalance: number;
  mainBalance: number;
  savingsBalance: number;
  investmentBalance: number;
  businessBalance: number;
  cashbackPending: number;
  canClaimCashback?: boolean;
  isPremiumCashback?: boolean;
  currency: string;
}
