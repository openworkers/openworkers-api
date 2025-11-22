import { z } from "zod";

// Cron
export const CronSchema = z.object({
  id: z.uuid(),
  value: z.string().min(1),
  workerId: z.uuid(),
  lastRun: z.coerce.date().nullable().optional(),
  nextRun: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable().optional(),
});

export const CronExpressionInputSchema = z.object({
  expression: z.string().min(1),
});

// Legacy GraphQL compatibility
export const CronCreateInputSchema = z.object({
  value: z.string().min(1),
  workerId: z.uuid(),
});

export const CronUpdateInputSchema = z.object({
  expression: z.string().min(1),
});

// Types
export type ICron = z.infer<typeof CronSchema>;
export type ICronExpressionInput = z.infer<typeof CronExpressionInputSchema>;
export type ICronCreateInput = z.infer<typeof CronCreateInputSchema>;
export type ICronUpdateInput = z.infer<typeof CronUpdateInputSchema>;
