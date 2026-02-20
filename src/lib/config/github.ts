import { z } from 'zod';
import { getEnv } from './env';

const Schema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional()
});

export type GithubConfig = z.infer<typeof Schema>;

let cached: GithubConfig | null = null;

export function getGithubConfig(): GithubConfig {
  if (cached) return cached;

  cached = Schema.parse({
    clientId: getEnv('GITHUB_CLIENT_ID'),
    clientSecret: getEnv('GITHUB_CLIENT_SECRET')
  });
  return cached;
}
