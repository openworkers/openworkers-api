import { jwt } from 'hono/jwt';
import type { JWTPayload } from '../types';
import { jwt as jwtConfig } from '../config';
import { HTTPException } from 'hono/http-exception';

declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    username: string;
    jwtPayload: JWTPayload;
  }
}

// Create JWT middleware with secret from config
export function createAuthMiddleware() {
  return jwt({
    secret: jwtConfig.access.secret,
    cookie: 'access_token' // Also check cookie for token
  });
}

// Error handler for JWT errors - returns JSON instead of text
export async function errorHandler(err: Error, c: any) {
  if (err instanceof HTTPException && err.status === 401) {
    return c.json({ error: 'Unauthorized', message: err.message }, 401);
  } else if (err instanceof HTTPException) {
    return c.json({ error: 'Error', message: err.message }, err.status);
  }

  throw err;
}

// Middleware to extract userId from JWT payload
export async function extractUser(c: any, next: any) {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!payload) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('userId', payload.sub);

  await next();
}
