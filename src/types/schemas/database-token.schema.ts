import { z } from 'zod';

// Valid operations for database tokens
export const DatabaseOperations = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP'] as const;
export type DatabaseOperation = (typeof DatabaseOperations)[number];

// Database token (without the actual token - only prefix is stored)
export const DatabaseTokenSchema = z.object({
  id: z.string().uuid(),
  databaseId: z.string().uuid(),
  name: z.string().min(1).max(100),
  tokenPrefix: z.string(),
  allowedOperations: z.array(z.enum(DatabaseOperations)),
  lastUsedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date()
});

// Create input
export const DatabaseTokenCreateInputSchema = z.object({
  name: z.string().min(1).max(100),
  allowedOperations: z
    .array(z.enum(DatabaseOperations))
    .min(1)
    .default(['SELECT', 'INSERT', 'UPDATE', 'DELETE'])
});

// Create response (includes the full token - only time it's visible)
export const DatabaseTokenCreateResponseSchema = DatabaseTokenSchema.extend({
  token: z.string()
});

// Types
export type IDatabaseToken = z.infer<typeof DatabaseTokenSchema>;
export type IDatabaseTokenCreateInput = z.infer<typeof DatabaseTokenCreateInputSchema>;
export type IDatabaseTokenCreateResponse = z.infer<typeof DatabaseTokenCreateResponseSchema>;
