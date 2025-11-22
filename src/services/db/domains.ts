import { sql } from "./client";
import type { IDomain } from "../../types";
import { findWorkerById } from "./workers";

// Domains
export async function findAllDomains(userId: string): Promise<IDomain[]> {
  return sql`
    SELECT name, worker_id as "workerId", user_id as "userId", created_at as "createdAt", updated_at as "updatedAt"
    FROM domains
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
}

export async function findDomainByName(
  name: string
): Promise<IDomain | null> {
  const domains = await sql`
    SELECT name, worker_id as "workerId", user_id as "userId", created_at as "createdAt", updated_at as "updatedAt"
    FROM domains
    WHERE name = ${name}
  `;
  return domains[0] || null;
}

export async function createDomain(
  userId: string,
  workerId: string,
  name: string
): Promise<IDomain> {
  // Verify worker ownership
  const worker = await findWorkerById(userId, workerId);
  if (!worker) {
    throw new Error("Worker not found or unauthorized");
  }

  const domains = await sql`
    INSERT INTO domains (name, worker_id, user_id)
    VALUES (${name}, ${workerId}, ${userId})
    RETURNING name, worker_id as "workerId", user_id as "userId", created_at as "createdAt", updated_at as "updatedAt"
  `;
  return domains[0];
}

export async function deleteDomain(
  userId: string,
  name: string
): Promise<number> {
  const result = await sql`
    DELETE FROM domains
    WHERE name = ${name} AND user_id = ${userId}
  `;
  return result.count || 0;
}
