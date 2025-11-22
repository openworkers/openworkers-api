import { sql } from "./client";
import type { ICron } from "../../types";
import { findWorkerById } from "./workers";

export async function findCronById(
  userId: string,
  cronId: string
): Promise<ICron | null> {
  const crons = await sql`
    SELECT c.id, c.value, c.worker_id as "workerId", c.next_run as "nextRun", c.last_run as "lastRun", c.created_at as "createdAt", c.updated_at as "updatedAt"
    FROM crons c
    JOIN workers w ON c.worker_id = w.id
    WHERE c.id = ${cronId} AND w.user_id = ${userId}
  `;
  return crons[0] || null;
}

export async function createCron(
  userId: string,
  workerId: string,
  value: string,
  nextRun: Date
): Promise<ICron> {
  // Verify worker ownership first
  const worker = await findWorkerById(userId, workerId);
  if (!worker) {
    throw new Error("Worker not found or unauthorized");
  }

  const crons = await sql`
    INSERT INTO crons (value, worker_id, next_run)
    VALUES (${value}, ${workerId}, ${nextRun})
    RETURNING id, value, worker_id as "workerId", next_run as "nextRun", last_run as "lastRun", created_at as "createdAt", updated_at as "updatedAt"
  `;
  return crons[0];
}

export async function updateCron(
  userId: string,
  cronId: string,
  value: string,
  nextRun: Date
): Promise<ICron | null> {
  // Verify ownership via join (updated_at auto-updated by trigger)
  const crons = await sql`
    UPDATE crons c
    SET value = ${value}, next_run = ${nextRun}
    FROM workers w
    WHERE c.worker_id = w.id
      AND c.id = ${cronId}
      AND w.user_id = ${userId}
    RETURNING c.id, c.value, c.worker_id as "workerId", c.next_run as "nextRun", c.last_run as "lastRun", c.created_at as "createdAt", c.updated_at as "updatedAt"
  `;
  return crons[0] || null;
}

export async function deleteCron(
  userId: string,
  cronId: string
): Promise<number> {
  const result = await sql`
    DELETE FROM crons c
    USING workers w
    WHERE c.worker_id = w.id
      AND c.id = ${cronId}
      AND w.user_id = ${userId}
  `;
  return result.count || 0;
}
