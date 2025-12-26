import { z } from 'zod';
import { ResourceSchema } from './base.schema';

// Environment Value
export const BindingTypeSchema = z.enum(['var', 'secret', 'assets', 'storage', 'kv']);

export const EnvironmentValueSchema = z.object({
  id: z.uuid(),
  key: z.string().min(1),
  value: z.string(),
  type: BindingTypeSchema
});

export const EnvironmentValueUpdateInputSchema = z.union([
  // Update: ID present, fields optional
  z.object({
    id: z.uuid(),
    key: z.string().min(1).optional(),
    value: z.string().nullable().optional(),
    type: BindingTypeSchema.optional()
  }),
  // Create: ID missing, fields required
  z.object({
    id: z.undefined().optional(),
    key: z.string().min(1),
    value: z.string(),
    type: BindingTypeSchema.optional().default('var')
  })
]);

// Environment

export const EnvironmentSchema = ResourceSchema.extend({
  values: z.array(EnvironmentValueSchema).nullable().optional(),
  workers: z.array(ResourceSchema).nullable().optional()
});

export const EnvironmentCreateInputSchema = z.object({
  name: z.string().min(1),
  desc: z.string().nullable().optional()
});

export const EnvironmentUpdateInputSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).optional(),
  desc: z.string().nullable().optional(),
  values: z.array(EnvironmentValueUpdateInputSchema).optional()
});

// Types
export type IEnvironmentValue = z.infer<typeof EnvironmentValueSchema>;
export type IEnvironmentValueUpdateInput = z.infer<typeof EnvironmentValueUpdateInputSchema>;
export type IEnvironment = z.infer<typeof EnvironmentSchema>;
export type IEnvironmentCreateInput = z.infer<typeof EnvironmentCreateInputSchema>;
export type IEnvironmentUpdateInput = z.infer<typeof EnvironmentUpdateInputSchema>;
