import { sql } from './client';
import type { IWorker } from '../../types';

interface WorkerRow {
  id: string;
  name: string;
  script: string;
  language: 'javascript' | 'typescript';
  userId: string;
  environmentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  environment?: IWorker['environment'];
  crons?: IWorker['crons'];
  domains?: IWorker['domains'];
}

export async function findAllWorkers(userId: string): Promise<IWorker[]> {
  return sql<WorkerRow>(
    `SELECT
      id,
      name,
      script,
      language::text as language,
      user_id as "userId",
      environment_id as "environmentId",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM workers
    WHERE user_id = $1::uuid
    ORDER BY created_at DESC`,
    [userId]
  );
}

export async function checkWorkerNameExists(name: string): Promise<boolean> {
  const workers = await sql<{ id: string }>(
    `SELECT id
    FROM workers
    WHERE name = $1
    LIMIT 1`,
    [name]
  );
  return workers.length > 0;
}

export async function findWorkerById(userId: string, workerId: string): Promise<IWorker | null> {
  const workers = await sql<WorkerRow>(
    `SELECT
      w.id,
      w.name,
      w.script,
      w.language::text as language,
      w.user_id as "userId",
      w.created_at as "createdAt",
      w.updated_at as "updatedAt",
      (
        SELECT json_build_object(
          'id', e.id,
          'name', e.name,
          'userId', e.user_id,
          'createdAt', e.created_at,
          'updatedAt', e.updated_at
        )
        FROM environments e
        WHERE e.id = w.environment_id
      ) as environment,
      (
        SELECT coalesce(json_agg(json_build_object(
          'id', c.id,
          'value', c.value,
          'workerId', c.worker_id,
          'nextRun', c.next_run,
          'lastRun', c.last_run,
          'createdAt', c.created_at,
          'updatedAt', c.updated_at
        )), '[]'::json)
        FROM crons c
        WHERE c.worker_id = w.id
      ) as crons,
      (
        SELECT coalesce(json_agg(json_build_object(
          'name', d.name,
          'workerId', d.worker_id,
          'userId', d.user_id,
          'createdAt', d.created_at,
          'updatedAt', d.updated_at
        )), '[]'::json)
        FROM domains d
        WHERE d.worker_id = w.id
      ) as domains
    FROM workers w
    WHERE w.id = $1::uuid AND w.user_id = $2::uuid`,
    [workerId, userId]
  );
  return workers[0] ?? null;
}

export async function createWorker(
  userId: string,
  name: string,
  script: string,
  language: 'javascript' | 'typescript',
  environmentId?: string
): Promise<IWorker> {
  const workers = await sql<WorkerRow>(
    `INSERT INTO workers (name, script, language, user_id, environment_id)
    VALUES ($1, $2, $3, $4::uuid, $5::uuid)
    RETURNING
      id,
      name,
      script,
      language::text as language,
      user_id as "userId",
      environment_id as "environmentId",
      created_at as "createdAt",
      updated_at as "updatedAt"`,
    [name, script, language, userId, environmentId ?? null]
  );
  return workers[0]!;
}

export async function updateWorker(
  userId: string,
  workerId: string,
  updates: {
    name?: string;
    script?: string;
    language?: 'javascript' | 'typescript';
    environmentId?: string | null;
    domains?: string[];
  }
): Promise<IWorker | null> {
  // Simple approach: always update all fields (use existing values if not provided)
  const current = await findWorkerById(userId, workerId);
  if (!current) {
    return null;
  }

  // Update worker fields (updated_at auto-updated by trigger)
  const workers = await sql<WorkerRow>(
    `UPDATE workers
    SET
      name = $1,
      script = $2,
      language = $3::enum_workers_language,
      environment_id = $4::uuid
    WHERE id = $5::uuid AND user_id = $6::uuid
    RETURNING
      id,
      name,
      script,
      language::text as language,
      user_id as "userId",
      environment_id as "environmentId",
      created_at as "createdAt",
      updated_at as "updatedAt"`,
    [
      updates.name ?? current.name,
      updates.script ?? current.script,
      updates.language ?? current.language,
      updates.environmentId === undefined ? (current.environment?.id ?? null) : updates.environmentId,
      workerId,
      userId
    ]
  );

  // Update domains if provided
  if (updates.domains !== undefined) {
    const { updateWorkerDomains } = await import('./domains');
    await updateWorkerDomains(userId, workerId, updates.domains);
  }

  return workers[0] ?? null;
}

export async function deleteWorker(userId: string, workerId: string): Promise<number> {
  const result = await sql<{ id: string }>(
    `DELETE FROM workers
    WHERE id = $1::uuid AND user_id = $2::uuid
    RETURNING id`,
    [workerId, userId]
  );
  return result.length;
}
