import { kysely } from './kysely-client';
import { uuid } from './kysely-helpers';
import type { IDomain } from '../../types';
import { findWorkerById } from './workers';

export async function findAllDomains(userId: string): Promise<IDomain[]> {
  return kysely
    .selectFrom('domains')
    .selectAll()
    .where('userId', '=', uuid(userId))
    .orderBy('createdAt', 'desc')
    .execute();
}

export async function findDomainByName(name: string): Promise<IDomain | null> {
  const domain = await kysely
    .selectFrom('domains')
    .selectAll()
    .where('name', '=', name)
    .executeTakeFirst();

  return domain ?? null;
}

export async function createDomain(userId: string, workerId: string, name: string): Promise<IDomain> {
  // Verify worker ownership
  const worker = await findWorkerById(userId, workerId);
  if (!worker) {
    throw new Error('Worker not found or unauthorized');
  }

  return kysely
    .insertInto('domains')
    .values({
      name,
      workerId: uuid(workerId),
      userId: uuid(userId),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteDomain(userId: string, name: string): Promise<number> {
  const result = await kysely
    .deleteFrom('domains')
    .where('name', '=', name)
    .where('userId', '=', uuid(userId))
    .returning('name')
    .execute();

  return result.length;
}

export async function deleteDomainsForWorker(userId: string, workerId: string, domainNames: string[]): Promise<number> {
  if (domainNames.length === 0) return 0;

  // Execute delete for each domain in parallel
  const results = await Promise.all(
    domainNames.map((name) =>
      kysely
        .deleteFrom('domains')
        .where('workerId', '=', uuid(workerId))
        .where('userId', '=', uuid(userId))
        .where('name', '=', name)
        .returning('name')
        .execute()
    )
  );

  // Sum up all deleted counts
  return results.reduce((total, result) => total + result.length, 0);
}

export async function updateWorkerDomains(userId: string, workerId: string, newDomains: string[]): Promise<void> {
  // Get current domains for this worker
  const currentDomains = await kysely
    .selectFrom('domains')
    .selectAll()
    .where('workerId', '=', uuid(workerId))
    .where('userId', '=', uuid(userId))
    .execute();

  const existing = currentDomains.map((d) => d.name);

  // Find domains to delete and create
  const toDelete = existing.filter((name) => !newDomains.includes(name));
  const toCreate = newDomains.filter((name) => !existing.includes(name));

  // Execute in parallel
  await Promise.all([
    // Delete removed domains
    toDelete.length > 0 ? deleteDomainsForWorker(userId, workerId, toDelete) : Promise.resolve(0),

    // Create new domains
    ...toCreate.map((name) => createDomain(userId, workerId, name)),
  ]);
}
