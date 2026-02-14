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
 * // Generates: WHERE tags @> $1::text[] (where $1 = '{admin,user}')
 */
export const textArray = <T extends readonly string[]>(value: T): RawBuilder<T> => {
  const pgArray = `{${value.join(',')}}`;
  return sql`${pgArray}::text[]` as RawBuilder<T>;
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

/**
 * Cast value to enum type for Postgate
 * @example
 * .where('type', '=', enumCast('set_password', 'auth_token_type'))
 * // Generates: WHERE type = $1::auth_token_type
 */
export const enumCast = <T>(value: T, enumType: string): RawBuilder<T> => {
  return sql`${value}::${sql.raw(enumType)}`;
};

/**
 * Cast array value to enum array type for Postgate
 * @example
 * .values({ allowedOperations: enumArray(['query', 'insert'], 'database_operation') })
 * // Generates: VALUES ($1::database_operation[]) (where $1 = '{query,insert}')
 */
export const enumArray = <T extends readonly string[]>(value: T, enumType: string): RawBuilder<T> => {
  const pgArray = `{${value.join(',')}}`;
  return sql`${pgArray}::${sql.raw(enumType)}[]` as RawBuilder<T>;
};

/**
 * Decode base64 string to bytea
 * @example
 * .values({ code: base64Decode(codeBase64) })
 * // Generates: decode($1, 'base64')
 */
export const base64Decode = (value: string): RawBuilder<Uint8Array> => {
  return sql`decode(${value}, 'base64')`;
};

/**
 * Convert bytea column to UTF8 text
 * @example
 * .select(byteaToText('code').as('script'))
 * // Generates: convert_from(code, 'UTF8') as script
 */
export const byteaToText = (column: string): RawBuilder<string> => {
  return sql<string>`convert_from(${sql.ref(column)}, 'UTF8')`;
};

/**
 * Cast enum column to text
 * @example
 * .select(enumToText('wd.code_type').as('language'))
 * // Generates: wd.code_type::text as language
 */
export const enumToText = <T = string>(column: string): RawBuilder<T> => {
  return sql<T>`${sql.ref(column)}::text`;
};
