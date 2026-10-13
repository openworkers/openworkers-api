import { kysely } from './kysely-client';
import { sql } from 'kysely';
import { uuid, now } from './kysely-helpers';

// A deleted namespace keeps its row (deleted_at set), so its ID never comes back. The key column never leaves the
// database: only the runner reads it.

export interface NamespaceRow {
  id: string;
  name: string;
  desc: string | null;
  workerId: string | null;
  workerName: string | null;
  className: string;
  createdAt: Date;
  updatedAt: Date;
}

function selectNamespaces(userId: string) {
  return kysely
    .selectFrom('durableObjectNamespaces as n')
    .leftJoin('workers as w', 'w.id', 'n.workerId')
    .select([
      'n.id',
      'n.name',
      'n.desc',
      'n.workerId',
      'w.name as workerName',
      'n.className',
      'n.createdAt',
      'n.updatedAt'
    ])
    .where('n.userId', '=', uuid(userId))
    .where('n.deletedAt', 'is', null);
}

export async function findAllNamespaces(userId: string): Promise<NamespaceRow[]> {
  return selectNamespaces(userId).orderBy('n.name').execute();
}

export async function findNamespaceById(userId: string, id: string): Promise<NamespaceRow | null> {
  const row = await selectNamespaces(userId).where('n.id', '=', uuid(id)).executeTakeFirst();

  return row ?? null;
}

export async function findNamespaceByName(userId: string, name: string): Promise<NamespaceRow | null> {
  const row = await selectNamespaces(userId).where('n.name', '=', name).executeTakeFirst();

  return row ?? null;
}

export async function findNamespaceByClass(
  userId: string,
  workerId: string,
  className: string
): Promise<NamespaceRow | null> {
  const row = await selectNamespaces(userId)
    .where('n.workerId', '=', uuid(workerId))
    .where('n.className', '=', className)
    .executeTakeFirst();

  return row ?? null;
}

export async function countNamespaces(userId: string): Promise<number> {
  const result = await kysely
    .selectFrom('durableObjectNamespaces')
    .select(sql<string>`COUNT(*)::text`.as('count'))
    .where('userId', '=', uuid(userId))
    .where('deletedAt', 'is', null)
    .executeTakeFirst();

  return parseInt(result?.count ?? '0', 10);
}

export async function createNamespace(
  userId: string,
  input: { name: string; desc: string | null; workerId: string; className: string }
): Promise<string> {
  const row = await kysely
    .insertInto('durableObjectNamespaces')
    .values({
      userId: uuid(userId),
      name: input.name,
      desc: input.desc,
      workerId: uuid(input.workerId),
      className: input.className
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  return row.id;
}

export async function updateNamespace(
  userId: string,
  id: string,
  input: { name?: string; desc?: string | null }
): Promise<boolean> {
  const row = await kysely
    .updateTable('durableObjectNamespaces')
    .set(input)
    .where('userId', '=', uuid(userId))
    .where('id', '=', uuid(id))
    .where('deletedAt', 'is', null)
    .returning('id')
    .executeTakeFirst();

  return row !== undefined;
}

export async function softDeleteNamespace(userId: string, id: string): Promise<boolean> {
  const row = await kysely
    .updateTable('durableObjectNamespaces')
    .set({ deletedAt: now() })
    .where('userId', '=', uuid(userId))
    .where('id', '=', uuid(id))
    .where('deletedAt', 'is', null)
    .returning('id')
    .executeTakeFirst();

  return row !== undefined;
}
