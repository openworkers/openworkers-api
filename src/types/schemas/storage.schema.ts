import { z } from 'zod';
import { ResourceSchema } from './base.schema';
import { ResourceCreateInputSchema } from './base.schema';
import { ResourceUpdateInputSchema } from './base.schema';

export const MASKED_SECRET = '********';

// Storage config (S3/R2 credentials) - used for both assets and storage bindings
// The binding type determines access: assets = read-only, storage = read/write
export const StorageConfigSchema = ResourceSchema.extend({
  mode: z.enum(['shared', 'custom']),
  // Custom mode fields (hidden for shared mode)
  bucket: z.string().max(255).optional(),
  prefix: z.string().max(255).nullable().optional(),
  accessKeyId: z.string().max(255).optional(), // Always masked as '********'
  secretAccessKey: z.string().max(255).optional(), // Always masked as '********'
  endpoint: z.string().max(255).nullable().optional(),
  region: z.string().max(50).nullable().optional(),
  publicUrl: z.string().max(255).nullable().optional()
});

// Create input - shared mode (uses platform R2, no credentials needed)
export const StorageConfigCreateSharedInputSchema = ResourceCreateInputSchema.extend({
  mode: z.literal('shared')
});

// Create input - custom mode (user provides S3/R2 credentials)
export const StorageConfigCreateCustomInputSchema = ResourceCreateInputSchema.extend({
  mode: z.literal('custom'),
  bucket: z.string().min(1).max(255),
  prefix: z.string().max(255).optional(),
  accessKeyId: z.string().min(1).max(255),
  secretAccessKey: z.string().min(1).max(255),
  endpoint: z.string().max(255).optional(),
  region: z.string().max(50).optional(),
  publicUrl: z.string().max(255).optional()
});

// Union of both create inputs
export const StorageConfigCreateInputSchema = z.discriminatedUnion('mode', [
  StorageConfigCreateSharedInputSchema,
  StorageConfigCreateCustomInputSchema
]);

// Update input - includes custom config fields
export const StorageConfigUpdateInputSchema = ResourceUpdateInputSchema.extend({
  bucket: z.string().min(1).max(255).optional(),
  prefix: z.string().max(255).nullable().optional(),
  accessKeyId: z.string().min(1).max(255).optional(),
  secretAccessKey: z.string().min(1).max(255).optional(),
  endpoint: z.string().max(255).nullable().optional(),
  region: z.string().max(50).nullable().optional(),
  publicUrl: z.string().max(255).nullable().optional()
});

// Types
export type IStorageConfig = z.infer<typeof StorageConfigSchema>;
export type IStorageConfigCreateInput = z.infer<typeof StorageConfigCreateInputSchema>;
export type IStorageConfigUpdateInput = z.infer<typeof StorageConfigUpdateInputSchema>;
