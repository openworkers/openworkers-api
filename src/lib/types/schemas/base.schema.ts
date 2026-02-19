import { z } from 'zod';

// Common base schema for resources with timestamps
export const TimestampsSchema = z.object({
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

// Common resource schema (id + name + desc + timestamps)
export const ResourceSchema = TimestampsSchema.extend({
  id: z.uuid(),
  name: z.string().min(1).max(100).trim(),
  desc: z.string().max(255).trim().nullable().optional()
});

export const ResourceCreateInputSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  desc: z.string().max(255).trim().optional()
});

export const ResourceUpdateInputSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  desc: z.string().max(255).trim().nullable().optional()
});

// Types
export type ITimestamps = z.infer<typeof TimestampsSchema>;
export type IResource = z.infer<typeof ResourceSchema>;
