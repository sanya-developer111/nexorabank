import { User } from '@prisma/client';

const SENSITIVE_FIELDS = [
  'passwordHash',
  'twoFactorSecret',
] as const;

export type SafeUser = Omit<User, 'passwordHash' | 'twoFactorSecret'>;

export function sanitizeUser(user: User): SafeUser {
  const { passwordHash: _, twoFactorSecret: __, ...safe } = user;
  return safe;
}

export function generateReferralCode(username: string): string {
  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${username.substring(0, 4).toUpperCase()}${suffix}`;
}
