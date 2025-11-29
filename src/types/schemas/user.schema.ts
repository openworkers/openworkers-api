import { z } from 'zod';

// Resource Limits
export const ResourceLimitsSchema = z.object({
  databases: z.number().int().min(0).default(3),
  environments: z.number().int().min(0).default(3),
  secondPrecision: z.boolean().default(false),
  workers: z.number().int().min(0).default(3)
});

// User / Self
export const SelfSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(1),
  avatarUrl: z.string().nullable().optional(),
  resourceLimits: ResourceLimitsSchema
});

// Types
export type IResourceLimits = z.infer<typeof ResourceLimitsSchema>;
export type ISelf = z.infer<typeof SelfSchema>;
