import { z } from 'zod';

// Common base schema for resources with timestamps
export const TimestampsSchema = z.object({
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

// Common resource schema (id + name + desc + timestamps)
export const ResourceSchema = TimestampsSchema.extend({
  id: z.uuid(),
  name: z.string().min(1),
  desc: z.string().nullable().optional()
});

// Types
export type ITimestamps = z.infer<typeof TimestampsSchema>;
export type IResource = z.infer<typeof ResourceSchema>;
