import { z } from 'zod';
import { ResourceSchema } from './base.schema';

// KV Namespace
export const KvNamespaceSchema = ResourceSchema.extend({
  name: z.string().min(1).max(255),
  desc: z.string().max(255).nullable().optional()
});

// Create input
export const KvNamespaceCreateInputSchema = z.object({
  name: z.string().min(1).max(255),
  desc: z.string().max(255).optional()
});

// Update input
export const KvNamespaceUpdateInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  desc: z.string().max(255).nullable().optional()
});

// Types
export type IKvNamespace = z.infer<typeof KvNamespaceSchema>;
export type IKvNamespaceCreateInput = z.infer<typeof KvNamespaceCreateInputSchema>;
export type IKvNamespaceUpdateInput = z.infer<typeof KvNamespaceUpdateInputSchema>;
