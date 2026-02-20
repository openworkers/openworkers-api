import { z } from 'zod';
import { getEnv } from './env';

const Schema = z.object({
  bucket: z.string().optional(),
  endpoint: z.string().optional(),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
  publicUrl: z.string().optional()
});

export type StorageConfig = z.infer<typeof Schema>;

let cached: StorageConfig | null = null;

export function getStorageConfig(): StorageConfig {
  if (cached) return cached;

  cached = Schema.parse({
    bucket: getEnv('SHARED_STORAGE_BUCKET'),
    endpoint: getEnv('SHARED_STORAGE_ENDPOINT'),
    accessKeyId: getEnv('SHARED_STORAGE_ACCESS_KEY_ID'),
    secretAccessKey: getEnv('SHARED_STORAGE_SECRET_ACCESS_KEY'),
    publicUrl: getEnv('SHARED_STORAGE_PUBLIC_URL')
  });
  return cached;
}
