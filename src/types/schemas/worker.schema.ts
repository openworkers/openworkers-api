import { z } from 'zod';
import { ResourceSchema } from './base.schema';
import { CronSchema } from './cron.schema';

// Worker Language
export const WorkerLanguageSchema = z.enum(['javascript', 'typescript']);

// Worker
export const WorkerSchema = ResourceSchema.extend({
  language: WorkerLanguageSchema,
  script: z.string(),
  environment: ResourceSchema.optional().nullable(),
  crons: z.array(CronSchema).optional(),
  domains: z.array(z.object({ name: z.string().min(1) })).optional()
});

export const WorkerCreateInputSchema = z.object({
  name: z.string().min(1),
  desc: z.string().nullable().optional(),
  language: WorkerLanguageSchema,
  script: z.string().optional()
});

export const WorkerUpdateInputSchema = z.object({
  name: z.string().min(1).optional(),
  desc: z.string().nullable().optional(),
  script: z.string().optional(),
  environment: z.uuid().nullable().optional(),
  domains: z.array(z.string()).optional()
});

// Types
export type IWorkerLanguage = z.infer<typeof WorkerLanguageSchema>;
export type IWorker = z.infer<typeof WorkerSchema>;
export type IWorkerCreateInput = z.infer<typeof WorkerCreateInputSchema>;
export type IWorkerUpdateInput = z.infer<typeof WorkerUpdateInputSchema>;
