import type { ApiResponse, Paginated, UserProfile, WalletSummary } from '@nexora/shared';
import { clearAuthToken, getAuthToken, getRefreshToken } from './utils';
import { tError } from './i18n';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile & { role: string };
}

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api';

function unwrapList<T>(data: T[] | Paginated<T>): T[] {
  if (Array.isArray(data)) return data;
  return data.items ?? [];
}

async function requestList<T>(path: string, options: RequestInit = {}): Promise<T[]> {
  const data = await request<T[] | Paginated<T>>(path, options);
  return unwrapList(data);
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearAuthToken();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new ApiError(tError('Unauthorized'), 401);
  }

  const json = (await res.json()) as ApiResponse<T>;

  if (!res.ok || !json.success) {
    const raw = json.error || json.message || 'Request failed';
    throw new ApiError(tError(raw), res.status);
  }

  return json.data as T;
}

export const api = {
  auth: {
    register: (body: { email: string; username: string; password: string; displayName: string }) =>
      request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    login: (body: { email: string; password: string }) =>
      request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    me: () => request<UserProfile & { role: string; email: string; loginStreak: number }>('/users/me'),
    logout: () => {
      const refreshToken = getRefreshToken();
      return request<void>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: refreshToken ?? '' }),
      });
    },
  },

  wallet: {
    summary: () => request<WalletSummary>('/wallet/summary'),
    accounts: () =>
      request<Array<{ id: string; type: string; balance: number; currency: string }>>('/wallet/accounts'),
    transfer: (body: {
      toUsername: string;
      amount: number;
      fromAccount: string;
      description?: string;
    }) => request<{ transactionId: string }>('/wallet/transfer', { method: 'POST', body: JSON.stringify(body) }),
    claimCashback: () =>
      request<{ amount: number; message: string }>('/wallet/cashback', { method: 'POST' }),
    transferInternal: (body: { fromAccount: string; toAccount: string; amount: number }) =>
      request<{ success: boolean }>('/wallet/transfer-internal', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    incoming: (since?: string) =>
      request<
        Array<{
          id: string;
          amount: number;
          description?: string;
          fromUsername?: string;
          fromDisplayName?: string;
          createdAt: string;
        }>
      >(`/wallet/incoming${since ? `?since=${encodeURIComponent(since)}` : ''}`),
    transactions: (page = 1, limit = 20) =>
      request<Paginated<{
        id: string;
        type: string;
        amount: number;
        status: string;
        description?: string;
        createdAt: string;
      }>>(`/wallet/transactions?page=${page}&limit=${limit}`),
  },

  quests: {
    list: (period: 'DAILY' | 'WEEKLY' | 'SEASONAL') =>
      request<
        Array<{
          id: string;
          title: string;
          description: string;
          progress: number;
          target: number;
          completed: boolean;
          claimed: boolean;
          nexReward: number;
          xpReward: number;
        }>
      >(`/quests?period=${period}`),
    claim: (id: string) => request<{ nexReward: number; xpReward: number }>(`/quests/${id}/claim`, { method: 'POST' }),
  },

  earn: {
    streak: () =>
      request<{ loginStreak: number; canClaim: boolean; reward: number }>('/earn/streak'),
    claimStreak: () => request<{ reward: number; loginStreak: number }>('/earn/streak/claim', { method: 'POST' }),
    wheelStatus: () => request<{ spinsRemaining: number; lastPrize?: string }>('/earn/wheel/status'),
    spinWheel: () => request<{ prize: string; amount: number }>('/earn/wheel/spin', { method: 'POST' }),
    openCase: (caseType: string) =>
      request<{ itemWon: string; rarity: string }>('/earn/cases/open', {
        method: 'POST',
        body: JSON.stringify({ caseType }),
      }),
    openChest: (chestType: string) =>
      request<{ rewards: Record<string, unknown> }>('/earn/chests/open', {
        method: 'POST',
        body: JSON.stringify({ chestType }),
      }),
    contracts: () =>
      request<
        Array<{
          id: string;
          title: string;
          description: string;
          reward: number;
          status: string;
          poster: { username: string };
        }>
      >('/earn/contracts'),
    takeContract: (id: string) => request<void>(`/earn/contracts/${id}/take`, { method: 'POST' }),
    businesses: () =>
      request<
        Array<{
          id: string;
          name: string;
          type: string;
          level: number;
          revenue: number;
          upkeep: number;
          canCollect: boolean;
        }>
      >('/earn/businesses'),
    createBusiness: (body: { name: string; type: string }) =>
      request<{ id: string }>('/earn/businesses', { method: 'POST', body: JSON.stringify(body) }),
    collectBusiness: (id: string) => request<{ revenue: number }>(`/earn/businesses/${id}/collect`, { method: 'POST' }),
    upgradeBusiness: (id: string) =>
      request<{ level: number; cost: number }>(`/earn/businesses/${id}/upgrade`, { method: 'POST' }),
    miniInfo: () =>
      request<{
        minBet: number;
        maxBet: number;
        games: Array<{
          id: string;
          name: string;
          description: string;
          multipliers: Array<{ value: number; winChance: number; choice?: string }>;
        }>;
      }>('/earn/mini/info'),
    playMini: (body: {
      game: string;
      bet: number;
      choice?: string;
      multiplier?: number;
      color?: string;
      guess?: number;
      hilo?: string;
    }) =>
      request<{
        won: boolean;
        bet: number;
        payout: number;
        profit: number;
        multiplier: number;
        balance: number;
        outcome?: string;
        outcomeRu?: string;
        roll?: number | string;
        rollRu?: string;
        reels?: string[];
        guess?: number;
      }>('/earn/mini/play', { method: 'POST', body: JSON.stringify(body) }),
  },

  invest: {
    assets: () =>
      request<
        Array<{
          id: string;
          symbol: string;
          name: string;
          type: string;
          price: number;
          change24h: number;
          volume24h: number;
        }>
      >('/investments/assets'),
    history: (symbol: string) =>
      request<Array<{ price: number; timestamp: string; volume: number }>>(
        `/investments/assets/${symbol}/history`,
      ),
    portfolio: () =>
      request<
        Array<{
          assetId: string;
          symbol: string;
          name: string;
          quantity: number;
          avgPrice: number;
          currentPrice: number;
          value: number;
          pnl: number;
        }>
      >('/investments/portfolio'),
    buy: (assetId: string, quantity: number) =>
      request<{ orderId: string }>('/investments/buy', {
        method: 'POST',
        body: JSON.stringify({ assetId, quantity }),
      }),
    sell: (assetId: string, quantity: number) =>
      request<{ orderId: string }>('/investments/sell', {
        method: 'POST',
        body: JSON.stringify({ assetId, quantity }),
      }),
  },

  marketplace: {
    inventory: () =>
      request<Array<{ inventoryId: string; itemId: string; name: string; rarity: string; quantity: number }>>(
        '/marketplace/inventory',
      ),
    shop: () =>
      request<
        Array<{
          id: string;
          name: string;
          description?: string;
          rarity: string;
          basePrice: number;
          category: string;
        }>
      >('/marketplace/shop'),
    listings: () =>
      requestList<{
        id: string;
        price: number;
        quantity: number;
        item: { name: string; rarity: string };
        seller: { username: string };
      }>('/marketplace/listings'),
    buyListing: (id: string) => request<void>(`/marketplace/listings/${id}/buy`, { method: 'POST' }),
    createListing: (body: { itemId: string; price: number; quantity: number }) =>
      request<{ id: string }>('/marketplace/listings', { method: 'POST', body: JSON.stringify(body) }),
    buyShopItem: (itemId: string) =>
      request<void>('/marketplace/shop/buy', { method: 'POST', body: JSON.stringify({ itemId }) }),
    scrapItem: (itemId: string, quantity = 1) =>
      request<{ payout: number; item: string }>('/marketplace/scrap', {
        method: 'POST',
        body: JSON.stringify({ itemId, quantity }),
      }),
  },

  auctions: {
    list: () =>
      requestList<{
        id: string;
        startPrice: number;
        currentBid: number;
        buyoutPrice?: number;
        endsAt: string;
        item: { name: string; rarity: string };
        seller: { username: string };
        bidCount: number;
      }>('/auctions'),
    create: (body: { itemId: string; startPrice: number; buyoutPrice?: number; endsAt: string }) =>
      request<{ id: string }>('/auctions', { method: 'POST', body: JSON.stringify(body) }),
    bid: (id: string, amount: number) =>
      request<void>(`/auctions/${id}/bid`, { method: 'POST', body: JSON.stringify({ amount }) }),
    cancel: (id: string) => request<{ success: boolean }>(`/auctions/${id}`, { method: 'DELETE' }),
  },

  social: {
    friends: () =>
      request<
        Array<{
          id: string;
          status: string;
          user: { id: string; username: string; displayName: string; level: number };
        }>
      >('/social/friends'),
    sendFriendRequest: (username: string) =>
      request<void>('/social/friends/request', { method: 'POST', body: JSON.stringify({ username }) }),
    acceptFriend: (id: string) => request<void>(`/social/friends/${id}/accept`, { method: 'POST' }),
    clans: () =>
      requestList<{
        id: string;
        name: string;
        tag: string;
        level: number;
        memberCount: number;
        treasury: number;
      }>('/social/clans'),
    joinClan: (clanId: string) =>
      request<void>('/social/clans/join', { method: 'POST', body: JSON.stringify({ clanId }) }),
    corporations: () =>
      requestList<{
        id: string;
        name: string;
        ticker: string;
        valuation: number;
        memberCount: number;
      }>('/social/corporations'),
    messages: () =>
      request<
        Array<{
          id: string;
          content: string;
          isRead: boolean;
          createdAt: string;
          sender: { username: string };
          receiver: { username: string };
        }>
      >('/social/messages'),
    sendMessage: (receiverUsername: string, content: string) =>
      request<void>('/social/messages', {
        method: 'POST',
        body: JSON.stringify({ receiverUsername, content }),
      }),
    chatHistory: (room = 'global') =>
      request<
        Array<{
          id: string;
          content: string;
          createdAt: string;
          user: { username: string; displayName: string };
        }>
      >(`/social/chat/${room}`),
  },

  users: {
    updateProfile: (body: { displayName?: string; avatar?: string; bio?: string; title?: string }) =>
      request<UserProfile>('/users/me', { method: 'PATCH', body: JSON.stringify(body) }),
    profile: (username: string) =>
      request<{
        profile: UserProfile;
        stats: { totalWealth: number; investments: number; achievements: number };
        achievements: Array<{ name: string; icon: string; unlockedAt: string }>;
        inventory: Array<{ name: string; rarity: string; quantity: number }>;
      }>(`/users/${username}`),
  },

  leaderboard: {
    list: (type: 'wealth' | 'level' | 'investments' = 'wealth') =>
      request<
        Array<{
          rank: number;
          username: string;
          displayName: string;
          avatar?: string | null;
          level: number;
          value: number;
          rank_title: string;
        }>
      >(`/leaderboard?type=${type}`),
  },

  premium: {
    plans: () =>
      request<
        Array<{
          id: string;
          name: string;
          price: number;
          benefits: string[];
        }>
      >('/premium/plans'),
    subscribe: (planId: string) =>
      request<{ expiresAt: string }>('/premium/subscribe', {
        method: 'POST',
        body: JSON.stringify({ planId }),
      }),
    status: () =>
      request<{
        isPremium: boolean;
        tier?: string | null;
        title?: string;
        avatarFrame?: string;
        expiresAt?: string;
      }>('/premium/status'),
  },

  battlepass: {
    get: () =>
      request<{
        season: { name: string; number: number; endsAt: string };
        currentTier: number;
        currentXp: number;
        isPremium: boolean;
        tiers: Array<{
          tier: number;
          xpRequired: number;
          freeReward?: Record<string, unknown>;
          premiumReward?: Record<string, unknown>;
          claimed: boolean;
        }>;
      }>('/battlepass'),
    claimTier: (tier: number) => request<void>(`/battlepass/claim/${tier}`, { method: 'POST' }),
  },

  tournaments: {
    list: () =>
      requestList<{
        id: string;
        name: string;
        description?: string;
        prizePool: number;
        entryFee: number;
        maxPlayers: number;
        playerCount: number;
        startsAt: string;
        endsAt: string;
        timeLeftMs: number;
        winDescription?: string;
        goalType?: string;
        goalTarget?: number;
        premiumOnly: boolean;
        isJoined: boolean;
        canJoin: boolean;
        entryFeeDiscount: number;
      }>('/tournaments'),
    join: (id: string) => request<void>(`/tournaments/${id}/join`, { method: 'POST' }),
  },

  activities: {
    videos: () =>
      request<
        Array<{
          id: string;
          title: string;
          description: string;
          durationSec: number;
          baseReward: number;
          videoUrl: string;
          videoType: string;
          watchedToday: boolean;
          canWatch: boolean;
        }>
      >('/activities/videos'),
    claimVideo: (videoId: string, watchedSeconds: number) =>
      request<{ reward: number; videoTitle: string }>('/activities/videos/claim', {
        method: 'POST',
        body: JSON.stringify({ videoId, watchedSeconds }),
      }),
    dailyTasks: () =>
      request<
        Array<{
          id: string;
          title: string;
          description: string;
          progress: number;
          target: number;
          reward: number;
          completed: boolean;
        }>
      >('/activities/daily-tasks'),
  },

  payments: {
    createQr: (amount: number, description?: string) =>
      request<{ code: string; amount: number; expiresAt: string; qrImage?: string }>('/payments/qr', {
        method: 'POST',
        body: JSON.stringify({ amount, description }),
      }),
    lookupQr: (code: string) =>
      request<{
        amount: number;
        description?: string;
        creator: string;
        creatorName: string;
        expiresAt: string;
      } | null>(`/payments/qr/${encodeURIComponent(code)}`),
    payQr: (code: string) =>
      request<{ amount: number; to: string; description?: string }>('/payments/qr/pay', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),
    myQrs: () =>
      request<Array<{ code: string; amount: number; isUsed: boolean; expiresAt: string }>>('/payments/qr/mine'),
  },

  trades: {
    create: (body: {
      type: 'gift' | 'exchange';
      toUsername: string;
      fromItemId?: string;
      fromQty?: number;
      toItemId?: string;
      toQty?: number;
      fromNexAmount?: number;
      toNexAmount?: number;
      nexAmount?: number;
      message?: string;
    }) => request<{ id: string }>('/trades', { method: 'POST', body: JSON.stringify(body) }),
    lookupPartner: (username: string) =>
      request<{
        username: string;
        displayName: string;
        inventory: Array<{ itemId: string; name: string; rarity: string; quantity: number }>;
      }>(`/trades/lookup/${encodeURIComponent(username)}`),
    incoming: () =>
      request<Array<{
        id: string;
        type: string;
        status: string;
        fromItemName?: string | null;
        toItemName?: string | null;
        fromNexAmount?: number;
        toNexAmount?: number;
        fromUser: { username: string; displayName: string };
      }>>('/trades/incoming'),
    accept: (id: string) => request<{ success: boolean }>(`/trades/${id}/accept`, { method: 'POST' }),
    cancel: (id: string) => request<{ success: boolean }>(`/trades/${id}/cancel`, { method: 'POST' }),
  },

  admin: {
    dashboard: () =>
      request<{
        users: { total: number; banned: number };
        economy: {
          totalSupply: number;
          circulating: number;
          burned: number;
          inflationRate: number;
        };
      }>('/admin/dashboard'),
    getUser: (id: string) =>
      request<{
        id: string;
        username: string;
        email: string;
        accounts: Array<{ type: string; balance: number }>;
      }>(`/admin/users/${id}`),
    users: (page = 1) =>
      request<
        Paginated<{
          id: string;
          username: string;
          email: string;
          role: string;
          level: number;
          isBanned: boolean;
          isPremium?: boolean;
          premiumUntil?: string | null;
        }>
      >(`/admin/users?page=${page}`),
    banUser: (id: string, reason: string) =>
      request<void>(`/admin/users/${id}/ban`, { method: 'POST', body: JSON.stringify({ reason }) }),
    unbanUser: (id: string) => request<void>(`/admin/users/${id}/unban`, { method: 'POST' }),
    adjustBalance: (body: { userId: string; amount: number; reason: string }) =>
      request<void>('/admin/users/adjust-balance', { method: 'POST', body: JSON.stringify(body) }),
    adjustAccount: (body: { userId: string; accountType: string; amount: number; reason: string }) =>
      request<void>('/admin/users/adjust-account', { method: 'POST', body: JSON.stringify(body) }),
    deleteUser: (id: string) =>
      request<{ deleted: boolean; username: string }>(`/admin/users/${id}/delete`, { method: 'POST' }),
    updateLevel: (body: { userId: string; level: number; xp?: number }) =>
      request<void>('/admin/users/level', { method: 'PATCH', body: JSON.stringify(body) }),
    videos: () =>
      request<Array<{
        id: string; slug: string; title: string; description: string;
        videoUrl: string; videoType: string; durationSec: number; baseReward: number; isActive: boolean;
      }>>('/admin/videos'),
    createVideo: (body: Record<string, unknown>) =>
      request<{ id: string }>('/admin/videos', { method: 'POST', body: JSON.stringify(body) }),
    updateVideo: (id: string, body: Record<string, unknown>) =>
      request<void>(`/admin/videos/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteVideo: (id: string) =>
      request<void>(`/admin/videos/${id}`, { method: 'DELETE' }),
    grantPremium: (body: { username?: string; userId?: string; plan: string; durationDays?: number }) =>
      request<{ username: string; plan: string; expiresAt: string }>('/admin/users/premium/grant', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    revokePremium: (userId: string) =>
      request<{ username: string; revoked: boolean }>(`/admin/users/${userId}/premium/revoke`, {
        method: 'POST',
      }),
    economy: () =>
      request<{
        users: { total: number; banned: number };
        economy: {
          totalSupply: number;
          circulating: number;
          burned: number;
          inflationRate: number;
        };
      }>('/admin/dashboard').then((d) => d.economy),
    events: () =>
      request<
        Array<{
          id: string;
          type: string;
          title: string;
          description: string;
          multiplier: number;
          startsAt: string;
          endsAt: string;
          isActive: boolean;
        }>
      >('/admin/economy/events'),
    createEvent: (body: Record<string, unknown>) =>
      request<{ id: string }>('/admin/economy/events', { method: 'POST', body: JSON.stringify(body) }),
    quests: () =>
      request<
        Array<{
          id: string;
          title: string;
          period: string;
          isActive: boolean;
        }>
      >('/admin/quests'),
    logs: (page = 1) =>
      request<
        Paginated<{
          id: string;
          action: string;
          entity?: string;
          userId?: string;
          createdAt: string;
        }>
      >(`/admin/logs?page=${page}`),
  },

  dashboard: {
    stats: () =>
      request<{
        balance: WalletSummary;
        recentActivity: Array<{ type: string; amount: number; createdAt: string }>;
        chartData: Array<{ date: string; balance: number }>;
      }>('/dashboard/stats'),
  },
};

export { ApiError };
