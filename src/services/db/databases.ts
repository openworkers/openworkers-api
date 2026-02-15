import { kysely } from './kysely-client';
import { uuid, now, enumCast } from './kysely-helpers';
import type { DatabaseProvider } from '../../types';

interface DatabaseConfigRow {
  id: string;
  name: string;
  desc: string | null;
  userId: string;
  provider: DatabaseProvider;
  connectionString: string | null;
  schemaName: string | null;
  maxRows: number;
  timeoutSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function findAllDatabases(userId: string): Promise<DatabaseConfigRow[]> {
  return kysely
    .selectFrom('databaseConfigs')
    .selectAll()
    .where('userId', '=', uuid(userId))
    .orderBy('createdAt', 'desc')
    .execute();
}

export async function findDatabaseById(userId: string, id: string): Promise<DatabaseConfigRow | null> {
  const row = await kysely
    .selectFrom('databaseConfigs')
    .selectAll()
    .where('id', '=', uuid(id))
    .where('userId', '=', uuid(userId))
    .executeTakeFirst();

  return row ?? null;
}

export async function findDatabaseByName(userId: string, name: string): Promise<DatabaseConfigRow | null> {
  const row = await kysely
    .selectFrom('databaseConfigs')
    .selectAll()
    .where('name', '=', name)
    .where('userId', '=', uuid(userId))
    .executeTakeFirst();

  return row ?? null;
}

interface CreatePlatformInput {
  name: string;
  desc?: string | null;
  schemaName: string;
  maxRows: number;
  timeoutSeconds: number;
}

export async function createPlatformDatabase(userId: string, input: CreatePlatformInput): Promise<DatabaseConfigRow> {
  return kysely
    .insertInto('databaseConfigs')
    .values({
      userId: uuid(userId),
      name: input.name,
      desc: input.desc ?? null,
      provider: enumCast('platform' as DatabaseProvider, 'database_provider'),
      schemaName: input.schemaName,
      maxRows: input.maxRows,
      timeoutSeconds: input.timeoutSeconds
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

interface CreatePostgresInput {
  name: string;
  desc?: string | null;
  connectionString: string;
  maxRows: number;
  timeoutSeconds: number;
}

export async function createPostgresDatabase(userId: string, input: CreatePostgresInput): Promise<DatabaseConfigRow> {
  return kysely
    .insertInto('databaseConfigs')
    .values({
      userId: uuid(userId),
      name: input.name,
      desc: input.desc ?? null,
      provider: enumCast('postgres' as DatabaseProvider, 'database_provider'),
      connectionString: input.connectionString,
      maxRows: input.maxRows,
      timeoutSeconds: input.timeoutSeconds
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteDatabase(userId: string, id: string): Promise<number> {
  const result = await kysely
    .deleteFrom('databaseConfigs')
    .where('id', '=', uuid(id))
    .where('userId', '=', uuid(userId))
    .returning('id')
    .execute();

  return result.length;
}

interface UpdateDatabaseInput {
  name?: string;
  desc?: string | null;
  maxRows?: number;
  timeoutSeconds?: number;
}

export async function updateDatabase(
  userId: string,
  id: string,
  input: UpdateDatabaseInput
): Promise<DatabaseConfigRow | null> {
  const updates: Partial<UpdateDatabaseInput & { updatedAt: any }> = {};

  if (input.name !== undefined) updates.name = input.name;
  if (input.desc !== undefined) updates.desc = input.desc;
  if (input.maxRows !== undefined) updates.maxRows = input.maxRows;
  if (input.timeoutSeconds !== undefined) updates.timeoutSeconds = input.timeoutSeconds;

  if (Object.keys(updates).length === 0) {
    return findDatabaseById(userId, id);
  }

  updates.updatedAt = now();

  const row = await kysely
    .updateTable('databaseConfigs')
    .set(updates)
    .where('id', '=', uuid(id))
    .where('userId', '=', uuid(userId))
    .returningAll()
    .executeTakeFirst();

  return row ?? null;
}
