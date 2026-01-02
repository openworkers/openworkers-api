import { z } from 'zod';

// API Key (without the actual token - only prefix is stored)
export const ApiKeySchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(100),
  desc: z.string().max(255).nullable().optional(),
  tokenPrefix: z.string(),
  lastUsedAt: z.coerce.date().nullable(),
  expiresAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date()
});

// Create input
export const ApiKeyCreateInputSchema = z.object({
  name: z.string().min(1).max(100),
  desc: z.string().max(255).optional(),
  expiresAt: z.string().datetime().optional()
});

// Create response (includes the full token - only time it's visible)
export const ApiKeyCreateResponseSchema = ApiKeySchema.extend({
  token: z.string()
});

// Types
export type IApiKey = z.infer<typeof ApiKeySchema>;
export type IApiKeyCreateInput = z.infer<typeof ApiKeyCreateInputSchema>;
export type IApiKeyCreateResponse = z.infer<typeof ApiKeyCreateResponseSchema>;
