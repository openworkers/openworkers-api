import { z } from 'zod';
import { getEnv } from './env';

const EnvironmentSchema = z.enum(['development', 'staging', 'production', 'test']);
export type Environment = z.infer<typeof EnvironmentSchema>;

let cachedNodeEnv: Environment | null = null;

export function getNodeEnv(): Environment {
  if (cachedNodeEnv) return cachedNodeEnv;

  cachedNodeEnv = EnvironmentSchema.parse(getEnv('NODE_ENV') ?? 'development');
  return cachedNodeEnv;
}

const PortSchema = z.coerce.number().int().positive().default(7000);

let cachedPort: number | null = null;

export function getPort(): number {
  if (cachedPort !== null) return cachedPort;

  cachedPort = PortSchema.parse(getEnv('PORT'));
  return cachedPort;
}
