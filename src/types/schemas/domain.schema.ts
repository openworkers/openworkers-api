import { z } from 'zod';
import { TimestampsSchema } from './base.schema';

// Domain schema
export const DomainSchema = TimestampsSchema.extend({
  name: z.hostname().min(1).trim(),
  workerId: z.uuid(),
  userId: z.uuid()
});

export const DomainCreateInputSchema = z.object({
  name: z.hostname().min(1).trim(),
  workerId: z.uuid()
});

// Types
export type IDomain = z.infer<typeof DomainSchema>;
export type IDomainCreateInput = z.infer<typeof DomainCreateInputSchema>;
