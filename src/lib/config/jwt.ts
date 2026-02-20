import { z } from 'zod';
import { getEnv } from './env';

const Schema = z.object({
  access: z.object({
    secret: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    expiresIn: z.string().default('15m')
  }),
  refresh: z.object({
    secret: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    expiresIn: z.string().default('18h')
  })
});

export type JwtConfig = z.infer<typeof Schema>;

let cached: JwtConfig | null = null;

export function getJwtConfig(): JwtConfig {
  if (cached) return cached;

  cached = Schema.parse({
    access: {
      secret: getEnv('JWT_ACCESS_SECRET'),
      expiresIn: getEnv('JWT_ACCESS_EXP')
    },
    refresh: {
      secret: getEnv('JWT_REFRESH_SECRET'),
      expiresIn: getEnv('JWT_REFRESH_EXP')
    }
  });
  return cached;
}
