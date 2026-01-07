import { z } from 'zod';
import { ResourceSchema } from './base.schema';
import { ResourceCreateInputSchema } from './base.schema';
import { ResourceUpdateInputSchema } from './base.schema';
import { CronSchema } from './cron.schema';

// Worker Language
export const WorkerLanguageSchema = z.enum(['javascript', 'typescript']);

// Worker
export const WorkerSchema = ResourceSchema.extend({
  language: WorkerLanguageSchema.nullable(),
  script: z.string().nullable(),
  environment: ResourceSchema.optional().nullable(),
  crons: z.array(CronSchema).optional(),
  domains: z.array(z.object({ name: z.string().min(1) })).optional()
});

export const WorkerCreateInputSchema = ResourceCreateInputSchema.extend({
  language: WorkerLanguageSchema,
  script: z.string().optional()
});

export const WorkerUpdateInputSchema = ResourceUpdateInputSchema.extend({
  script: z.string().optional(),
  environment: z.uuid().nullable().optional(),
  language: WorkerLanguageSchema.optional(),
  domains: z.array(z.string()).optional()
});

// Types
export type IWorkerLanguage = z.infer<typeof WorkerLanguageSchema>;
export type IWorker = z.infer<typeof WorkerSchema>;
export type IWorkerCreateInput = z.infer<typeof WorkerCreateInputSchema>;
export type IWorkerUpdateInput = z.infer<typeof WorkerUpdateInputSchema>;
