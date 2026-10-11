import { findUserById } from './db/users';
import { ServiceError } from './errors';

const LABELS = {
  workers: 'Worker',
  environments: 'Environment',
  databases: 'Database',
  kv: 'KV namespace',
  storage: 'Storage config',
  d1: 'D1 database'
};

// The count must match what the list page counts, so the server and the New button agree
export async function refuseOverLimit(userId: string, kind: keyof typeof LABELS, count: number): Promise<void> {
  const user = await findUserById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  const limit = user.limits[kind];

  if (count >= limit) {
    throw new ServiceError(`${LABELS[kind]} limit reached (${limit})`, 403);
  }
}
