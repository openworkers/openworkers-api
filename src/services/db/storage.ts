import { kysely } from './kysely-client';
import { uuid, now } from './kysely-helpers';
import { sql } from 'kysely';

export interface StorageConfigRow {
  id: string;
  name: string;
  desc: string | null;
  bucket: string;
  prefix: string | null;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string | null;
  region: string | null;
  publicUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function findAllStorageConfigs(userId: string): Promise<StorageConfigRow[]> {
  return kysely
    .selectFrom('storageConfigs')
    .selectAll()
    .where('userId', '=', uuid(userId))
    .orderBy('createdAt', 'desc')
    .execute();
}

export async function findStorageConfigById(userId: string, id: string): Promise<StorageConfigRow | null> {
  const row = await kysely
    .selectFrom('storageConfigs')
    .selectAll()
    .where('userId', '=', uuid(userId))
    .where('id', '=', uuid(id))
    .executeTakeFirst();

  return row ?? null;
}

export async function findStorageConfigByName(userId: string, name: string): Promise<StorageConfigRow | null> {
  const row = await kysely
    .selectFrom('storageConfigs')
    .selectAll()
    .where('userId', '=', uuid(userId))
    .where('name', '=', name)
    .executeTakeFirst();

  return row ?? null;
}

export async function createStorageConfig(
  userId: string,
  name: string,
  bucket: string,
  accessKeyId: string,
  secretAccessKey: string,
  desc?: string,
  prefix?: string,
  endpoint?: string,
  region?: string,
  publicUrl?: string
): Promise<StorageConfigRow> {
  return kysely
    .insertInto('storageConfigs')
    .values({
      userId: uuid(userId),
      name,
      desc: desc ?? null,
      bucket,
      prefix: prefix ?? null,
      accessKeyId,
      secretAccessKey,
      endpoint: endpoint ?? null,
      region: region ?? null,
      publicUrl: publicUrl ?? null
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export interface StorageConfigUpdateInput {
  name?: string;
  desc?: string | null;
  bucket?: string;
  prefix?: string | null;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string | null;
  region?: string | null;
  publicUrl?: string | null;
}

export async function updateStorageConfig(
  userId: string,
  id: string,
  input: StorageConfigUpdateInput
): Promise<StorageConfigRow | null> {
  const updates: Partial<typeof input> = {};

  if (input.name !== undefined) updates.name = input.name;
  if (input.desc !== undefined) updates.desc = input.desc;
  if (input.bucket !== undefined) updates.bucket = input.bucket;
  if (input.prefix !== undefined) updates.prefix = input.prefix;
  if (input.accessKeyId !== undefined) updates.accessKeyId = input.accessKeyId;
  if (input.secretAccessKey !== undefined) updates.secretAccessKey = input.secretAccessKey;
  if (input.endpoint !== undefined) updates.endpoint = input.endpoint;
  if (input.region !== undefined) updates.region = input.region;
  if (input.publicUrl !== undefined) updates.publicUrl = input.publicUrl;

  if (Object.keys(updates).length === 0) {
    return findStorageConfigById(userId, id);
  }

  const row = await kysely
    .updateTable('storageConfigs')
    .set({ ...updates, updatedAt: now() })
    .where('userId', '=', uuid(userId))
    .where('id', '=', uuid(id))
    .returningAll()
    .executeTakeFirst();

  return row ?? null;
}

export async function deleteStorageConfig(userId: string, id: string): Promise<number> {
  const result = await kysely
    .deleteFrom('storageConfigs')
    .where('userId', '=', uuid(userId))
    .where('id', '=', uuid(id))
    .returning('id')
    .execute();

  return result.length;
}

export async function countStorageConfigs(userId: string): Promise<number> {
  const result = await kysely
    .selectFrom('storageConfigs')
    .select(sql<string>`COUNT(*)::text`.as('count'))
    .where('userId', '=', uuid(userId))
    .executeTakeFirst();

  return parseInt(result?.count ?? '0', 10);
}
