import { z } from 'zod';

// Log
export const LogSchema = z.object({
  date: z.number().int(),
  level: z.string(),
  message: z.string()
});

// Types
export type ILog = z.infer<typeof LogSchema>;
