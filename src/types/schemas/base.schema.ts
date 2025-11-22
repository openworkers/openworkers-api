import { z } from 'zod';

// Common base schema for resources with timestamps
export const TimestampsSchema = z.object({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Common resource schema (id + name + desc + timestamps)
export const ResourceSchema = TimestampsSchema.extend({
  id: z.string().uuid(),
  name: z.string().min(1),
  desc: z.string().nullable()
});

// Types
export type Timestamps = z.infer<typeof TimestampsSchema>;
export type Resource = z.infer<typeof ResourceSchema>;
