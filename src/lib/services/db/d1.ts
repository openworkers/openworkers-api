import { kysely } from './kysely-client';
import { sql } from 'kysely';
import { uuid, jsonb, now } from './kysely-helpers';

// A deleted database keeps its row (deleted_at set), so its ID never comes back

export interface D1DatabaseRow {
  id: string;
  name: string;
  desc: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const d1Select = ['id', 'name', 'desc', 'createdAt', 'updatedAt'] as const;

export async function findAllD1Databases(userId: string): Promise<D1DatabaseRow[]> {
  return kysely
    .selectFrom('d1Databases')
    .select(d1Select)
    .where('userId', '=', uuid(userId))
    .where('deletedAt', 'is', null)
    .orderBy('createdAt', 'desc')
    .execute();
}

export async function findD1DatabaseById(userId: string, id: string): Promise<D1DatabaseRow | null> {
  const row = await kysely
    .selectFrom('d1Databases')
    .select(d1Select)
    .where('userId', '=', uuid(userId))
    .where('id', '=', uuid(id))
    .where('deletedAt', 'is', null)
    .executeTakeFirst();

  return row ?? null;
}

export async function findD1DatabaseByName(userId: string, name: string): Promise<D1DatabaseRow | null> {
  const row = await kysely
    .selectFrom('d1Databases')
    .select(d1Select)
    .where('userId', '=', uuid(userId))
    .where('name', '=', name)
    .where('deletedAt', 'is', null)
    .executeTakeFirst();

  return row ?? null;
}

export async function countD1Databases(userId: string): Promise<number> {
  const result = await kysely
    .selectFrom('d1Databases')
    .select(sql<string>`COUNT(*)::text`.as('count'))
    .where('userId', '=', uuid(userId))
    .where('deletedAt', 'is', null)
    .executeTakeFirst();

  return parseInt(result?.count ?? '0', 10);
}

export async function createD1Database(userId: string, name: string, desc: string | null): Promise<D1DatabaseRow> {
  return kysely
    .insertInto('d1Databases')
    .values({ userId: uuid(userId), name, desc })
    .returning(d1Select)
    .executeTakeFirstOrThrow();
}

export async function updateD1Database(
  userId: string,
  id: string,
  input: { name?: string; desc?: string | null }
): Promise<D1DatabaseRow | null> {
  const row = await kysely
    .updateTable('d1Databases')
    .set(input)
    .where('userId', '=', uuid(userId))
    .where('id', '=', uuid(id))
    .where('deletedAt', 'is', null)
    .returning(d1Select)
    .executeTakeFirst();

  return row ?? null;
}

export async function softDeleteD1Database(userId: string, id: string): Promise<boolean> {
  const row = await kysely
    .updateTable('d1Databases')
    .set({ deletedAt: now() })
    .where('userId', '=', uuid(userId))
    .where('id', '=', uuid(id))
    .where('deletedAt', 'is', null)
    .returning('id')
    .executeTakeFirst();

  return row !== undefined;
}

// Management SQL goes through the runner, which owns the SQLite files: a client inserts a request and the runner
// writes the result into the same row

export async function insertD1Request(databaseId: string, request: unknown): Promise<string> {
  const row = await kysely
    .insertInto('d1Requests')
    .values({ databaseId: uuid(databaseId), request: jsonb(request) })
    .returning('id')
    .executeTakeFirstOrThrow();

  return row.id;
}

export async function findD1RequestResult(id: string): Promise<{ result: unknown } | null> {
  const row = await kysely
    .selectFrom('d1Requests')
    .select('result')
    .where('id', '=', uuid(id))
    .where('finishedAt', 'is not', null)
    .executeTakeFirst();

  return row ?? null;
}

export async function deleteD1Request(id: string): Promise<{ result: unknown } | null> {
  const row = await kysely.deleteFrom('d1Requests').where('id', '=', uuid(id)).returning('result').executeTakeFirst();

  return row ?? null;
}
