import { kysely } from './kysely-client';
import { sql } from 'kysely';
import { uuid, jsonb, timestamptz, now } from './kysely-helpers';

export interface KvNamespaceRow {
  id: string;
  name: string;
  desc: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function findAllKvNamespaces(userId: string): Promise<KvNamespaceRow[]> {
  return kysely
    .selectFrom('kvConfigs')
    .select(['id', 'name', 'desc', 'createdAt', 'updatedAt'])
    .where('userId', '=', uuid(userId))
    .orderBy('createdAt', 'desc')
    .execute();
}

export async function findKvNamespaceById(userId: string, id: string): Promise<KvNamespaceRow | null> {
  const result = await kysely
    .selectFrom('kvConfigs')
    .select(['id', 'name', 'desc', 'createdAt', 'updatedAt'])
    .where('userId', '=', uuid(userId))
    .where('id', '=', uuid(id))
    .executeTakeFirst();

  return result ?? null;
}

export async function findKvNamespaceByName(userId: string, name: string): Promise<KvNamespaceRow | null> {
  const result = await kysely
    .selectFrom('kvConfigs')
    .select(['id', 'name', 'desc', 'createdAt', 'updatedAt'])
    .where('userId', '=', uuid(userId))
    .where('name', '=', name)
    .executeTakeFirst();

  return result ?? null;
}

export async function createKvNamespace(userId: string, name: string, desc?: string): Promise<KvNamespaceRow> {
  return kysely
    .insertInto('kvConfigs')
    .values({
      userId: uuid(userId),
      name,
      desc: desc ?? null,
    })
    .returning(['id', 'name', 'desc', 'createdAt', 'updatedAt'])
    .executeTakeFirstOrThrow();
}

export async function updateKvNamespace(
  userId: string,
  id: string,
  name?: string,
  desc?: string | null
): Promise<KvNamespaceRow | null> {
  const updates: { name?: string; desc?: string | null; updatedAt?: any } = {};

  if (name !== undefined) updates.name = name;
  if (desc !== undefined) updates.desc = desc;

  if (Object.keys(updates).length === 0) {
    return findKvNamespaceById(userId, id);
  }

  updates.updatedAt = now();

  const result = await kysely
    .updateTable('kvConfigs')
    .set(updates)
    .where('userId', '=', uuid(userId))
    .where('id', '=', uuid(id))
    .returning(['id', 'name', 'desc', 'createdAt', 'updatedAt'])
    .executeTakeFirst();

  return result ?? null;
}

export async function deleteKvNamespace(userId: string, id: string): Promise<number> {
  const result = await kysely
    .deleteFrom('kvConfigs')
    .where('userId', '=', uuid(userId))
    .where('id', '=', uuid(id))
    .returning('id')
    .execute();

  return result.length;
}

export async function countKvNamespaces(userId: string): Promise<number> {
  const result = await kysely
    .selectFrom('kvConfigs')
    .select(sql<string>`COUNT(*)::text`.as('count'))
    .where('userId', '=', uuid(userId))
    .executeTakeFirst();

  return parseInt(result?.count ?? '0', 10);
}

// ============ KV Data Operations ============

export interface KvDataRow {
  key: string;
  value: unknown;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KvDataListResult {
  items: KvDataRow[];
  cursor: string | null;
  hasMore: boolean;
}

export async function listKvData(
  namespaceId: string,
  options: { prefix?: string; cursor?: string; limit?: number }
): Promise<KvDataListResult> {
  const limit = Math.min(options.limit ?? 50, 100);

  let query = kysely
    .selectFrom('kvData')
    .selectAll()
    .where('namespaceId', '=', uuid(namespaceId))
    .where((eb) => eb.or([eb('expiresAt', 'is', null), eb('expiresAt', '>', now())]));

  if (options.prefix) {
    query = query.where('key', 'like', `${options.prefix}%`);
  }

  if (options.cursor) {
    query = query.where('key', '>', options.cursor);
  }

  const rows = await query.orderBy('key', 'asc').limit(limit + 1).execute();

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const cursor = hasMore ? (items[items.length - 1]?.key ?? null) : null;

  return { items, cursor, hasMore };
}

export async function putKvData(
  namespaceId: string,
  key: string,
  value: unknown,
  expiresIn?: number
): Promise<KvDataRow> {
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

  return kysely
    .insertInto('kvData')
    .values({
      namespaceId: uuid(namespaceId),
      key,
      value: jsonb(value),
      expiresAt: expiresAt ? timestamptz(expiresAt) : null,
    })
    .onConflict((oc) =>
      oc.columns(['namespaceId', 'key']).doUpdateSet({
        value: jsonb(value),
        expiresAt: expiresAt ? timestamptz(expiresAt) : null,
        updatedAt: now(),
      })
    )
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteKvData(namespaceId: string, key: string): Promise<boolean> {
  const result = await kysely
    .deleteFrom('kvData')
    .where('namespaceId', '=', uuid(namespaceId))
    .where('key', '=', key)
    .returning('key')
    .execute();

  return result.length > 0;
}
