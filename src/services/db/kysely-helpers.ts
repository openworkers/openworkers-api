import { sql } from 'kysely';
import type { RawBuilder } from 'kysely';

/**
 * Cast value to UUID type for Postgate
 * @example
 * .where('id', '=', uuid(userId))
 * // Generates: WHERE id = $1::uuid
 */
export const uuid = (value: string): RawBuilder<string> => {
  return sql<string>`${value}::uuid`;
};

/**
 * Cast value to JSONB type for Postgate
 * @example
 * .set({ data: jsonb({ foo: 'bar' }) })
 * // Generates: SET data = $1::jsonb
 */
export const jsonb = (value: unknown): RawBuilder<unknown> => {
  return sql`${JSON.stringify(value)}::jsonb`;
};

/**
 * Cast value to TIMESTAMPTZ type for Postgate
 * @example
 * .set({ expiresAt: timestamptz(new Date()) })
 * // Generates: SET expires_at = $1::timestamptz
 */
export const timestamptz = (value: Date | string): RawBuilder<Date> => {
  const isoString = typeof value === 'string' ? value : value.toISOString();
  return sql`${isoString}::timestamptz`;
};

/**
 * Cast value to TEXT[] type for Postgate
 * @example
 * .where('tags', '@>', textArray(['admin', 'user']))
 * // Generates: WHERE tags @> $1::text[]
 */
export const textArray = (value: string[]): RawBuilder<string[]> => {
  return sql`${JSON.stringify(value)}::text[]`;
};

/**
 * SQL NOW() function
 * @example
 * .set({ updatedAt: now() })
 * // Generates: SET updated_at = now()
 */
export const now = (): RawBuilder<Date> => {
  return sql<Date>`now()`;
};
