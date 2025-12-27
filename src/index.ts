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
import ai from './routes/ai';
import pkg from '../package.json';

export const app = new Hono();

// Global middlewares
app.use('*', logger());
app.onError(errorHandler);

if (nodeEnv === 'development') {
  app.use('*', cors());
}

// Health check (no auth required)
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
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
v1.route('/ai', ai);
v1.route('/', users);

app.route('/api/v1', v1);

import { nodeEnv, port } from './config';

// Start server
console.log(`OpenWorkers API starting on port ${port}...`);

export default {
  port,
  fetch: app.fetch,
  development: nodeEnv === 'development'
};
