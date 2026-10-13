import { z } from 'zod';
import { ResourceSchema } from './base.schema';
import { ResourceCreateInputSchema } from './base.schema';
import { ResourceUpdateInputSchema } from './base.schema';

// The name the worker exports the class under, as the database checks it
export const ClassNameSchema = z
  .string()
  .max(100)
  .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, 'A class name is a JavaScript identifier');

// The worker is null once it is deleted; the storage of the objects stays until the namespace goes
export const DurableObjectNamespaceSchema = ResourceSchema.extend({
  workerId: z.uuid().nullable(),
  workerName: z.string().nullable(),
  className: z.string()
});

export const DurableObjectNamespaceCreateInputSchema = ResourceCreateInputSchema.extend({
  // A name or an ID of a worker of the account
  worker: z.string().trim().min(1),
  className: ClassNameSchema
});

export const DurableObjectNamespaceUpdateInputSchema = ResourceUpdateInputSchema.extend({
  // No additional fields
});

// Types
export type IDurableObjectNamespace = z.infer<typeof DurableObjectNamespaceSchema>;
export type IDurableObjectNamespaceCreateInput = z.infer<typeof DurableObjectNamespaceCreateInputSchema>;
export type IDurableObjectNamespaceUpdateInput = z.infer<typeof DurableObjectNamespaceUpdateInputSchema>;
