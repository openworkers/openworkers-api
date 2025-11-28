import { z } from 'zod';
import { ResourceSchema } from './base.schema';

// SQL Operation enum
export const SqlOperationSchema = z.enum(['SELECT', 'INSERT', 'UPDATE', 'DELETE']);

// Database rules
export const DatabaseRulesSchema = z.object({
  allowed_operations: z.array(SqlOperationSchema).default(['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
  max_rows: z.number().int().positive().default(1000),
  timeout_seconds: z.number().int().positive().default(30)
});

// Database schema (extends Resource: id, name, desc, createdAt, updatedAt)
export const DatabaseSchema = ResourceSchema.extend({
  schemaName: z.string().nullable().optional()
});

// Create input
export const DatabaseCreateInputSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-z][a-z0-9_]*$/,
      'Name must start with a letter and contain only lowercase letters, numbers, and underscores'
    ),
  allowed_operations: z.array(SqlOperationSchema).optional(),
  max_rows: z.number().int().positive().max(10000).optional(),
  timeout_seconds: z.number().int().positive().max(300).optional()
});

// Types
export type ISqlOperation = z.infer<typeof SqlOperationSchema>;
export type IDatabaseRules = z.infer<typeof DatabaseRulesSchema>;
export type IDatabase = z.infer<typeof DatabaseSchema>;
export type IDatabaseCreateInput = z.infer<typeof DatabaseCreateInputSchema>;
