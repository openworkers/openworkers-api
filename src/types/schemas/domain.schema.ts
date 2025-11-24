import { z } from 'zod';

// Domain schema
export const DomainSchema = z.object({
  name: z.string().min(1),
  workerId: z.uuid(),
  userId: z.uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const DomainCreateInputSchema = z.object({
  name: z.string().min(1),
  workerId: z.uuid()
});

// Types
export type IDomain = z.infer<typeof DomainSchema>;
export type IDomainCreateInput = z.infer<typeof DomainCreateInputSchema>;
