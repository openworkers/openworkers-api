import { sql } from "./client";
import type { IWorker } from "../../types";

export async function findAllWorkers(userId: string): Promise<IWorker[]> {
  return sql`
    SELECT id, name, script, language, user_id as "userId", environment_id as "environmentId", created_at as "createdAt", updated_at as "updatedAt"
    FROM workers
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
}

export async function checkWorkerNameExists(
  name: string
): Promise<boolean> {
  const workers = await sql`
    SELECT id
    FROM workers
    WHERE name = ${name}
    LIMIT 1
  `;
  return workers.length > 0;
}

export async function findWorkerById(
  userId: string,
  workerId: string
): Promise<IWorker | null> {
  const workers = await sql`
    SELECT
      w.id,
      w.name,
      w.script,
      w.language,
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
    WHERE w.id = ${workerId} AND w.user_id = ${userId}
  `;
  return workers[0] || null;
}

export async function createWorker(
  userId: string,
  name: string,
  script: string,
  language: "javascript" | "typescript",
  environmentId?: string
): Promise<IWorker> {
  const workers = await sql`
    INSERT INTO workers (name, script, language, user_id, environment_id)
    VALUES (${name}, ${script}, ${language}, ${userId}, ${environmentId || null})
    RETURNING id, name, script, language, user_id as "userId", environment_id as "environmentId", created_at as "createdAt", updated_at as "updatedAt"
  `;
  return workers[0];
}

export async function updateWorker(
  userId: string,
  workerId: string,
  updates: {
    name?: string;
    script?: string;
    language?: "javascript" | "typescript";
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
  const workers = await sql`
    UPDATE workers
    SET
      name = ${updates.name ?? current.name},
      script = ${updates.script ?? current.script},
      language = ${updates.language ?? current.language},
      environment_id = ${updates.environmentId === undefined ? (current.environment?.id ?? null) : updates.environmentId}
    WHERE id = ${workerId} AND user_id = ${userId}
    RETURNING id, name, script, language, user_id as "userId", environment_id as "environmentId", created_at as "createdAt", updated_at as "updatedAt"
  `;

  // Update domains if provided
  if (updates.domains !== undefined) {
    const { updateWorkerDomains } = await import("./domains");
    await updateWorkerDomains(userId, workerId, updates.domains);
  }

  return workers[0] || null;
}

export async function deleteWorker(
  userId: string,
  workerId: string
): Promise<number> {
  const result = await sql`
    DELETE FROM workers
    WHERE id = ${workerId} AND user_id = ${userId}
  `;
  return result.count || 0;
}
