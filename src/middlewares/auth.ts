import { jwt } from 'hono/jwt';
import type { JWTPayload } from '../types';

declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    username: string;
    jwtPayload: JWTPayload;
  }
}

// Create JWT middleware with secret from env
export function createAuthMiddleware() {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET environment variable not set');
  }

  return jwt({
    secret,
    cookie: 'access_token', // Also check cookie for token
  });
}

// Middleware to extract userId from JWT payload
export async function extractUser(c: any, next: any) {
  const payload = c.get('jwtPayload') as JWTPayload;

  if (!payload) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('userId', payload.userId);
  c.set('username', payload.username);

  await next();
}
