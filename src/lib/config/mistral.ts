import { z } from 'zod';
import { getEnv } from './env';

const Schema = z.object({
  apiKey: z.string().optional()
});

export type MistralConfig = z.infer<typeof Schema>;

let cached: MistralConfig | null = null;

export function getMistralConfig(): MistralConfig {
  if (cached) return cached;

  cached = Schema.parse({
    apiKey: getEnv('MISTRAL_API_KEY')
  });
  return cached;
}
