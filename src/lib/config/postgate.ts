import { z } from 'zod';
import { getEnv } from './env';

const Schema = z.object({
  url: z.url().default('http://localhost:6080'),
  token: z
    .string()
    .regex(/^pg_[a-f0-9]{64}$/, 'POSTGATE_TOKEN must be a valid pg_xxx token')
    .optional()
});

export type PostgateConfig = z.infer<typeof Schema>;

let cached: PostgateConfig | null = null;

export function getPostgateConfig(): PostgateConfig {
  if (cached) return cached;

  cached = Schema.parse({
    url: getEnv('POSTGATE_URL'),
    token: getEnv('POSTGATE_TOKEN')
  });

  return cached;
}
