import { Injectable } from '@nestjs/common';

@Injectable()
export class RedisService {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async incr(key: string): Promise<number> {
    const current = parseInt((await this.get(key)) ?? '0', 10);
    const next = current + 1;
    await this.set(key, String(next));
    return next;
  }

  async expire(key: string, seconds: number): Promise<void> {
    const item = this.store.get(key);
    if (item) item.expiresAt = Date.now() + seconds * 1000;
  }
}