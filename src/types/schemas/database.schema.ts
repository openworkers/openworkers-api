import { z } from 'zod';
import { ResourceSchema } from './base.schema';
import { ResourceCreateInputSchema } from './base.schema';

// Database schema (extends Resource: id, name, desc, createdAt, updatedAt)
export const DatabaseSchema = ResourceSchema;

// Create input
// Note: allowed_operations is set per-token with default ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
export const DatabaseCreateInputSchema = ResourceCreateInputSchema.extend({
  maxRows: z.number().int().positive().max(10000).optional()
});

// Types
export type IDatabase = z.infer<typeof DatabaseSchema>;
export type IDatabaseCreateInput = z.infer<typeof DatabaseCreateInputSchema>;
