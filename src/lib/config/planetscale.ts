import { z } from 'zod';
import { getEnv } from './env';

const Schema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  appId: z.string().optional(),
  appUrl: z.string().url().default('http://localhost:4200')
});

export type PlanetScaleConfig = z.infer<typeof Schema>;

let cached: PlanetScaleConfig | null = null;

export function getPlanetScaleConfig(): PlanetScaleConfig {
  if (cached) return cached;

  cached = Schema.parse({
    clientId: getEnv('PLANET_SCALE_CLIENT_ID'),
    clientSecret: getEnv('PLANET_SCALE_CLIENT_SECRET'),
    appId: getEnv('PLANET_SCALE_APP_ID'),
    appUrl: getEnv('APP_URL')
  });
  return cached;
}
