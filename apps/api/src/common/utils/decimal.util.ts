import { Decimal } from '@prisma/client/runtime/library';

export function toNumber(value: Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  return value.toNumber();
}

export function serializeDecimals<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Decimal) return toNumber(obj) as T;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map((item) => serializeDecimals(item)) as T;
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeDecimals(value);
    }
    return result as T;
  }
  return obj;
}
