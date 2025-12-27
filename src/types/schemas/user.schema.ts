import { z } from 'zod';

// Resource Limits (now as dedicated columns)
export const ResourceLimitsSchema = z.object({
  workers: z.number().int().min(0).default(5),
  environments: z.number().int().min(0).default(5),
  databases: z.number().int().min(0).default(3),
  kv: z.number().int().min(0).default(3),
  assets: z.number().int().min(0).default(3),
  storage: z.number().int().min(0).default(3),
  secondPrecision: z.boolean().default(false)
});

// User / Self
export const SelfSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(1),
  avatarUrl: z.string().nullable().optional(),
  limits: ResourceLimitsSchema
});

// Types
export type IResourceLimits = z.infer<typeof ResourceLimitsSchema>;
export type ISelf = z.infer<typeof SelfSchema>;
