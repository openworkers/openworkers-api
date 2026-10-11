import { z } from 'zod';
import { ResourceSchema } from './base.schema';
import { ResourceCreateInputSchema } from './base.schema';
import { ResourceUpdateInputSchema } from './base.schema';

export const D1DatabaseSchema = ResourceSchema.extend({
  // No additional fields
});

export const D1DatabaseCreateInputSchema = ResourceCreateInputSchema.extend({
  // No additional fields
});

export const D1DatabaseUpdateInputSchema = ResourceUpdateInputSchema.extend({
  // No additional fields
});

// The runner checks the operation; the API only routes it (openworkers-core/docs/d1.md)
export const D1RequestSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('op'), op: z.looseObject({ kind: z.string() }) }),
  z.object({ type: z.literal('migrate'), name: z.string().min(1), sql: z.string(), checksum: z.string().min(1) })
]);

// Types
export type ID1Database = z.infer<typeof D1DatabaseSchema>;
export type ID1DatabaseCreateInput = z.infer<typeof D1DatabaseCreateInputSchema>;
export type ID1DatabaseUpdateInput = z.infer<typeof D1DatabaseUpdateInputSchema>;
export type ID1Request = z.infer<typeof D1RequestSchema>;
