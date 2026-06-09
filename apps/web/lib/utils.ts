import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { xpInCurrentLevel } from '@nexora/shared';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getXpProgress(totalXp: number) {
  const { current, needed } = xpInCurrentLevel(totalXp);
  return { current, needed, percent: Math.min(100, (current / needed) * 100) };
}

export function formatNex(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `◈ ${num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercent(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

export function setAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('nexora_token', token);
  document.cookie = `nexora_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function setRefreshToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('nexora_refresh_token', token);
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('nexora_token');
  localStorage.removeItem('nexora_refresh_token');
  document.cookie = 'nexora_token=; path=/; max-age=0';
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('nexora_token');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('nexora_refresh_token');
}
