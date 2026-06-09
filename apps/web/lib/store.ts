'use client';

import { create } from 'zustand';
import type { UserProfile, WalletSummary } from '@nexora/shared';
import { api } from './api';
import { clearAuthToken, getAuthToken, setAuthToken, setRefreshToken } from './utils';

interface AuthUser extends UserProfile {
  role: string;
  email?: string;
  loginStreak?: number;
}

interface AppState {
  user: AuthUser | null;
  wallet: WalletSummary | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  setWallet: (wallet: WalletSummary | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; password: string; displayName: string }) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  fetchWallet: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  wallet: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setWallet: (wallet) => set({ wallet }),

  login: async (email, password) => {
    const { accessToken, refreshToken, user } = await api.auth.login({ email, password });
    setAuthToken(accessToken);
    setRefreshToken(refreshToken);
    set({ user, isAuthenticated: true });
    await get().fetchWallet();
  },

  register: async (data) => {
    const { accessToken, refreshToken, user } = await api.auth.register(data);
    setAuthToken(accessToken);
    setRefreshToken(refreshToken);
    set({ user, isAuthenticated: true });
    await get().fetchWallet();
  },

  logout: async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    }
    clearAuthToken();
    set({ user: null, wallet: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    try {
      const user = await api.auth.me();
      set({ user, isAuthenticated: true });
    } catch {
      clearAuthToken();
      set({ user: null, isAuthenticated: false });
    }
  },

  fetchWallet: async () => {
    try {
      const wallet = await api.wallet.summary();
      set({ wallet });
    } catch {
      set({ wallet: null });
    }
  },

  initialize: async () => {
    set({ isLoading: true });
    const token = getAuthToken();
    if (token) {
      await get().fetchUser();
      if (get().isAuthenticated) {
        await get().fetchWallet();
      }
    }
    set({ isLoading: false });
  },
}));
