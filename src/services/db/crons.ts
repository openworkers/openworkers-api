import { kysely } from './kysely-client';
import { uuid, timestamptz } from './kysely-helpers';
import { sql } from 'kysely';
import type { ICron } from '../../types';
import { findWorkerById } from './workers';

const cronSelect = [
  'crons.id',
  'crons.value',
  'crons.workerId',
  'crons.nextRun',
  'crons.lastRun',
  'crons.createdAt',
  'crons.updatedAt'
] as const;

export async function findCronById(userId: string, cronId: string): Promise<ICron | null> {
  const cron = await kysely
    .selectFrom('crons')
    .innerJoin('workers', 'crons.workerId', 'workers.id')
    .select(cronSelect)
    .where('crons.id', '=', uuid(cronId))
    .where('workers.userId', '=', uuid(userId))
    .executeTakeFirst();

  return cron ?? null;
}

export async function createCron(userId: string, workerId: string, value: string, nextRun: Date): Promise<ICron> {
  // Verify worker ownership first
  const worker = await findWorkerById(userId, workerId);
  if (!worker) {
    throw new Error('Worker not found or unauthorized');
  }

  return kysely
    .insertInto('crons')
    .values({
      value,
      workerId: uuid(workerId),
      nextRun: timestamptz(nextRun)
    })
    .returning(cronSelect)
    .executeTakeFirstOrThrow();
}

export async function updateCron(userId: string, cronId: string, value: string, nextRun: Date): Promise<ICron | null> {
  // Verify ownership via join (updated_at auto-updated by trigger)
  const result = await sql<ICron>`
    UPDATE crons c
    SET value = ${value}, next_run = ${timestamptz(nextRun)}
    FROM workers w
    WHERE c.worker_id = w.id
      AND c.id = ${uuid(cronId)}
      AND w.user_id = ${uuid(userId)}
    RETURNING
      c.id,
      c.value,
      c.worker_id as "workerId",
      c.next_run as "nextRun",
      c.last_run as "lastRun",
      c.created_at as "createdAt",
      c.updated_at as "updatedAt"
  `.execute(kysely);

  return result.rows[0] ?? null;
}

export async function deleteCron(userId: string, cronId: string): Promise<number> {
  const result = await sql<{ id: string }>`
    DELETE FROM crons c
    USING workers w
    WHERE c.worker_id = w.id
      AND c.id = ${uuid(cronId)}
      AND w.user_id = ${uuid(userId)}
    RETURNING c.id
  `.execute(kysely);

  return result.rows.length;
}
