import { describe, test, expect, mock, beforeEach } from 'bun:test';
import type { StorageConfigRow } from './db/storage';

const shared = {
  bucket: 'shared-bucket',
  endpoint: 'https://shared.example',
  accessKeyId: 'shared-key',
  secretAccessKey: 'shared-secret',
  publicUrl: null
};

const platformRow: StorageConfigRow = {
  id: 'p',
  name: 'assets',
  desc: null,
  bucket: shared.bucket,
  prefix: 'tenant-prefix',
  accessKeyId: shared.accessKeyId,
  secretAccessKey: shared.secretAccessKey,
  endpoint: shared.endpoint,
  region: null,
  publicUrl: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

const s3Row: StorageConfigRow = {
  ...platformRow,
  id: 's',
  bucket: 'own-bucket',
  prefix: null,
  accessKeyId: 'own-key',
  secretAccessKey: 'own-secret',
  endpoint: 'https://own.example'
};

let row: StorageConfigRow;
const updates: unknown[] = [];

mock.module('../config/storage', () => ({
  getStorageConfig: () => shared,
  sharedStorageConfigured: () => true
}));

mock.module('./db/storage', () => ({
  findStorageConfigById: async () => row,
  findStorageConfigByName: async () => null,
  updateStorageConfig: async (_userId: string, _id: string, input: object) => {
    updates.push(input);
    return { ...row, ...input };
  }
}));

const { storageService } = await import('./storage');
const { ServiceError } = await import('./errors');

describe('storageService.update', () => {
  beforeEach(() => {
    updates.length = 0;
  });

  // A platform config holds the shared credentials; its prefix is the only thing that isolates tenants
  test.each([
    ['prefix', { prefix: null }],
    ['prefix', { prefix: 'other-tenant' }],
    ['bucket', { bucket: 'other-bucket' }],
    ['endpoint', { endpoint: 'https://attacker.example' }],
    ['credentials', { accessKeyId: 'k', secretAccessKey: 's' }]
  ])('refuses a %s change on a platform config', async (_, input) => {
    row = platformRow;

    const error = await storageService.update('u', 'p', input).catch((e) => e);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.status).toBe(400);
    expect(updates).toEqual([]);
  });

  test('refuses a change on a row that holds the shared key, whatever its endpoint', async () => {
    row = { ...platformRow, endpoint: 'https://elsewhere.example' };

    const error = await storageService.update('u', 'p', { prefix: null }).catch((e) => e);

    expect(error).toBeInstanceOf(ServiceError);
    expect(updates).toEqual([]);
  });

  test('renames a platform config', async () => {
    row = platformRow;

    await storageService.update('u', 'p', { name: 'renamed', desc: 'text' });

    expect(updates).toEqual([{ name: 'renamed', desc: 'text' }]);
  });

  test('changes the prefix of an S3 config', async () => {
    row = s3Row;

    await storageService.update('u', 's', { prefix: 'folder' });

    expect(updates).toEqual([{ prefix: 'folder' }]);
  });
});
