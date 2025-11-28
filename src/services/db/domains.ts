import { sql } from './client';
import type { IDomain } from '../../types';
import { findWorkerById } from './workers';

// Domains
export async function findAllDomains(userId: string): Promise<IDomain[]> {
  return sql<IDomain>(
    `SELECT
      name,
      worker_id as "workerId",
      user_id as "userId",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM domains
    WHERE user_id = $1::uuid
    ORDER BY created_at DESC`,
    [userId]
  );
}

export async function findDomainByName(name: string): Promise<IDomain | null> {
  const domains = await sql<IDomain>(
    `SELECT
      name,
      worker_id as "workerId",
      user_id as "userId",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM domains
    WHERE name = $1`,
    [name]
  );
  return domains[0] ?? null;
}

export async function createDomain(userId: string, workerId: string, name: string): Promise<IDomain> {
  // Verify worker ownership
  const worker = await findWorkerById(userId, workerId);
  if (!worker) {
    throw new Error('Worker not found or unauthorized');
  }

  const domains = await sql<IDomain>(
    `INSERT INTO domains (name, worker_id, user_id)
    VALUES ($1, $2::uuid, $3::uuid)
    RETURNING
      name,
      worker_id as "workerId",
      user_id as "userId",
      created_at as "createdAt",
      updated_at as "updatedAt"`,
    [name, workerId, userId]
  );
  return domains[0]!;
}

export async function deleteDomain(userId: string, name: string): Promise<number> {
  const result = await sql<{ name: string }>(
    `DELETE FROM domains
    WHERE name = $1 AND user_id = $2::uuid
    RETURNING name`,
    [name, userId]
  );
  return result.length;
}

export async function deleteDomainsForWorker(userId: string, workerId: string, domainNames: string[]): Promise<number> {
  if (domainNames.length === 0) return 0;

  // Execute delete for each domain in parallel
  const results = await Promise.all(
    domainNames.map((name) =>
      sql<{ name: string }>(
        `DELETE FROM domains
        WHERE worker_id = $1::uuid AND user_id = $2::uuid AND name = $3
        RETURNING name`,
        [workerId, userId, name]
      )
    )
  );

  // Sum up all deleted counts
  return results.reduce((total, result) => total + result.length, 0);
}

export async function updateWorkerDomains(userId: string, workerId: string, newDomains: string[]): Promise<void> {
  // Get current domains for this worker
  const currentDomains = await sql<IDomain>(
    `SELECT
      name,
      worker_id as "workerId",
      user_id as "userId",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM domains
    WHERE worker_id = $1::uuid AND user_id = $2::uuid`,
    [workerId, userId]
  );

  const existing = currentDomains.map((d) => d.name);

  // Find domains to delete and create
  const toDelete = existing.filter((name) => !newDomains.includes(name));
  const toCreate = newDomains.filter((name) => !existing.includes(name));

  // Execute in parallel
  await Promise.all([
    // Delete removed domains
    toDelete.length > 0 ? deleteDomainsForWorker(userId, workerId, toDelete) : Promise.resolve(0),

    // Create new domains
    ...toCreate.map((name) => createDomain(userId, workerId, name))
  ]);
}
