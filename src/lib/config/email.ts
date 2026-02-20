import { z } from 'zod';
import { getEnv } from './env';

const Schema = z.object({
  provider: z.enum(['scaleway']).optional(),
  from: z.string().default('noreply@openworkers.dev'),
  secretKey: z.string().optional(),
  projectId: z.string().optional(),
  region: z.string().default('fr-par'),
  appUrl: z.string().url().default('http://localhost:4200')
});

export type EmailConfig = z.infer<typeof Schema>;

let cached: EmailConfig | null = null;

export function getEmailConfig(): EmailConfig {
  if (cached) return cached;

  cached = Schema.parse({
    provider: getEnv('EMAIL_PROVIDER'),
    from: getEnv('EMAIL_FROM'),
    secretKey: getEnv('SCW_SECRET_KEY'),
    projectId: getEnv('SCW_PROJECT_ID'),
    region: getEnv('SCW_REGION'),
    appUrl: getEnv('APP_URL')
  });
  return cached;
}
