import { findD1DatabaseById } from './db/d1';
import { findDatabaseById } from './db/databases';
import { findKvNamespaceById } from './db/kv';
import { findStorageConfigById } from './db/storage';
import { findWorker } from './db/workers';
import { isUuid } from '../utils/validation';

export type ResourceBindingType = 'assets' | 'storage' | 'kv' | 'database' | 'worker' | 'd1';

// The runner resolves a binding by id only, so the API must check who owns the target
export async function ownsBindingTarget(userId: string, type: ResourceBindingType, id: string): Promise<boolean> {
  if (!isUuid(id)) {
    return false;
  }

  switch (type) {
    case 'assets':
    case 'storage':
      return (await findStorageConfigById(userId, id)) !== null;
    case 'kv':
      return (await findKvNamespaceById(userId, id)) !== null;
    case 'database':
      return (await findDatabaseById(userId, id)) !== null;
    case 'worker':
      return (await findWorker(userId, id)) !== null;
    case 'd1':
      return (await findD1DatabaseById(userId, id)) !== null;
  }
}
