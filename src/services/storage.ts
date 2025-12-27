import * as db from './db/storage';
import * as usersDb from './db/users';
import { sharedStorage } from '../config';
import type { IStorageConfig, IStorageConfigCreateInput, IStorageConfigUpdateInput } from '../types';

// Determine mode from storage config row
function getMode(row: db.StorageConfigRow): 'shared' | 'custom' {
  // Shared mode uses platform R2 (endpoint is null or matches sharedStorage endpoint)
  // Custom mode has user-provided endpoint
  return row.endpoint === null || row.endpoint === sharedStorage.endpoint ? 'shared' : 'custom';
}

function rowToStorageConfig(row: db.StorageConfigRow): IStorageConfig {
  const mode = getMode(row);

  return {
    id: row.id,
    name: row.name,
    desc: row.desc,
    mode,
    // Expose S3 details for custom mode, hide bucket/endpoint for shared
    bucket: mode === 'custom' ? row.bucket : undefined,
    prefix: row.prefix,
    endpoint: mode === 'custom' ? row.endpoint : undefined,
    region: mode === 'custom' ? row.region : undefined,
    publicUrl: row.publicUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class StorageService {
  async findAll(userId: string): Promise<IStorageConfig[]> {
    const rows = await db.findAllStorageConfigs(userId);
    return rows.map(rowToStorageConfig);
  }

  async findById(userId: string, id: string): Promise<IStorageConfig | null> {
    const row = await db.findStorageConfigById(userId, id);

    if (!row) {
      return null;
    }

    return rowToStorageConfig(row);
  }

  async create(userId: string, input: IStorageConfigCreateInput): Promise<IStorageConfig> {
    const { name, desc, mode } = input;

    // Check limit
    const user = await usersDb.findUserById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const count = await db.countStorageConfigs(userId);

    if (count >= user.limits.storage) {
      throw new Error(`Storage config limit reached (${user.limits.storage})`);
    }

    // Check if name already exists
    const existing = await db.findStorageConfigByName(userId, name);

    if (existing) {
      throw new Error(`Storage config with name "${name}" already exists`);
    }

    let row: db.StorageConfigRow;

    if (mode === 'shared') {
      // Shared mode: use platform R2 credentials with user-specific prefix
      if (!sharedStorage.bucket || !sharedStorage.accessKeyId || !sharedStorage.secretAccessKey) {
        throw new Error('Shared storage is not configured on this platform');
      }

      row = await db.createStorageConfig(
        userId,
        name,
        sharedStorage.bucket,
        sharedStorage.accessKeyId,
        sharedStorage.secretAccessKey,
        desc,
        crypto.randomUUID(),
        sharedStorage.endpoint ?? undefined,
        undefined, // region not needed for R2
        sharedStorage.publicUrl ?? undefined
      );
    } else {
      // Custom mode: use user-provided credentials
      row = await db.createStorageConfig(
        userId,
        name,
        input.bucket,
        input.accessKeyId,
        input.secretAccessKey,
        desc,
        input.prefix,
        input.endpoint,
        input.region,
        input.publicUrl
      );
    }

    return rowToStorageConfig(row);
  }

  async update(userId: string, id: string, input: IStorageConfigUpdateInput): Promise<IStorageConfig | null> {
    const { name, desc } = input;

    // If renaming, check if new name already exists
    if (name) {
      const existing = await db.findStorageConfigByName(userId, name);

      if (existing && existing.id !== id) {
        throw new Error(`Storage config with name "${name}" already exists`);
      }
    }

    const row = await db.updateStorageConfig(userId, id, name, desc);

    if (!row) {
      return null;
    }

    return rowToStorageConfig(row);
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const deleted = await db.deleteStorageConfig(userId, id);
    return deleted > 0;
  }

  /**
   * Get storage config with credentials (for internal use like presigning)
   */
  async getConfigWithCredentials(userId: string, id: string): Promise<db.StorageConfigRow | null> {
    return db.findStorageConfigById(userId, id);
  }
}

export const storageService = new StorageService();
