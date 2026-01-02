import { jwt } from 'hono/jwt';
import type { Context, Next } from 'hono';
import type { JWTPayload } from '../types';
import { jwt as jwtConfig } from '../config';
import { HTTPException } from 'hono/http-exception';
import { findApiKeyByToken, updateApiKeyLastUsed } from '../services/db/api-keys';

declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    username: string;
    jwtPayload: JWTPayload;
    authMethod: 'jwt' | 'api_key';
  }
}

// Create JWT middleware with secret from config
export function createJwtMiddleware() {
  return jwt({
    secret: jwtConfig.access.secret,
    cookie: 'access_token' // Also check cookie for token
  });
}

// Combined auth middleware: API key first, then JWT
export function createAuthMiddleware() {
  const jwtMiddleware = createJwtMiddleware();

  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    // Check for API key (Bearer ow_...)
    if (authHeader?.startsWith('Bearer ow_')) {
      const token = authHeader.substring(7);
      const apiKey = await findApiKeyByToken(token);

      if (!apiKey) {
        return c.json({ error: 'Invalid API key' }, 401);
      }

      // Set user context
      c.set('userId', apiKey.userId);
      c.set('authMethod', 'api_key');

      // Update last used (fire and forget)
      updateApiKeyLastUsed(apiKey.id).catch(() => {});

      return next();
    }

    // Fall back to JWT
    return jwtMiddleware(c, next);
  };
}

// Error handler for JWT errors - returns JSON instead of text
export async function errorHandler(err: Error, c: Context) {
  if (err instanceof HTTPException && err.status === 401) {
    return c.json({ error: 'Unauthorized', message: err.message }, 401);
  } else if (err instanceof HTTPException) {
    return c.json({ error: 'Error', message: err.message }, err.status);
  }

  throw err;
}

// Middleware to extract userId from JWT payload (only needed for JWT auth)
export async function extractUser(c: Context, next: Next) {
  // Skip if already authenticated via API key
  if (c.get('authMethod') === 'api_key') {
    return next();
  }

  const payload = c.get('jwtPayload') as JWTPayload;

  if (!payload) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('userId', payload.sub);
  c.set('authMethod', 'jwt');

  await next();
}
