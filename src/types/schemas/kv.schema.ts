import { z } from 'zod';
import { ResourceSchema } from './base.schema';
import { ResourceCreateInputSchema } from './base.schema';
import { ResourceUpdateInputSchema } from './base.schema';

// KV Namespace
export const KvNamespaceSchema = ResourceSchema.extend({
  // No additional fields
});

// Create input
export const KvNamespaceCreateInputSchema = ResourceCreateInputSchema.extend({
  // No additional fields
});

// Update input
export const KvNamespaceUpdateInputSchema = ResourceUpdateInputSchema.extend({
  // No additional fields
});

// Types
export type IKvNamespace = z.infer<typeof KvNamespaceSchema>;
export type IKvNamespaceCreateInput = z.infer<typeof KvNamespaceCreateInputSchema>;
export type IKvNamespaceUpdateInput = z.infer<typeof KvNamespaceUpdateInputSchema>;
