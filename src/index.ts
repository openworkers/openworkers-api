import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createAuthMiddleware, extractUser, errorHandler } from './middlewares/auth';
import authRoutes from './routes/auth';
import users from './routes/users';
import workers from './routes/workers';
import crons from './routes/crons';
import environments from './routes/environments';
import domains from './routes/domains';
import databases from './routes/databases';
import kv from './routes/kv';
import storage from './routes/storage';
import ai from './routes/ai';
import apiKeys from './routes/api-keys';
import pkg from '../package.json';
import { sql } from './services/db/client';

export const app = new Hono();

// Global middlewares
app.use('*', logger());
app.onError(errorHandler);

if (nodeEnv === 'development') {
  app.use('*', cors());
}

// API routes (no version prefix for health checks)
const api = new Hono();

// Health check (no auth required)
api.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Postgate connection test (no auth required)
api.get('/postgate', async (c) => {
  try {
    const result = await sql<{ result: number }>('SELECT 1 + 1 AS result');
    return c.json({ status: 'ok', result: result[0]?.result });
  } catch (error) {
    return c.json({ status: 'error', error: String(error) }, 500);
  }
});

// API v1 routes
const v1 = new Hono();

// Version endpoint (no auth required)
v1.get('/version', (c) => {
  return c.json({ version: pkg.version, name: pkg.name });
});

// Auth routes (no JWT required - these CREATE the tokens)
v1.route('/', authRoutes);

// Protected routes (require JWT)
v1.use('*', createAuthMiddleware());
v1.use('*', extractUser);

// Mount protected route modules
v1.route('/workers', workers);
v1.route('/crons', crons);
v1.route('/environments', environments);
v1.route('/domains', domains);
v1.route('/databases', databases);
v1.route('/kv', kv);
v1.route('/storage', storage);
v1.route('/ai', ai);
v1.route('/api-keys', apiKeys);
v1.route('/', users);

api.route('/v1', v1);
app.route('/api', api);

import { nodeEnv, port } from './config';

// Start server
console.log(`OpenWorkers API starting on port ${port}...`);

export default {
  port,
  fetch: app.fetch,
  development: nodeEnv === 'development',
  idleTimeout: 60
};
