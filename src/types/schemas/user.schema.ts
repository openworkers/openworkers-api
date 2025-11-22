import { z } from 'zod';

// Resource Limits
export const ResourceLimitsSchema = z.object({
  environments: z.number().int().min(0),
  secondPrecision: z.boolean(),
  workers: z.number().int().min(0)
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
