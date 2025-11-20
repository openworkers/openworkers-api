import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { initDb } from './services/db';
import { createAuthMiddleware, extractUser } from './middlewares/auth';
import workers from './routes/workers';

const app = new Hono();

// Global middlewares
app.use('*', logger());
app.use('*', cors());

// Health check (no auth required)
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected routes (require JWT)
const api = new Hono();
api.use('*', createAuthMiddleware());
api.use('*', extractUser);

// Mount route modules
api.route('/workers', workers);
// TODO: Add more routes
// api.route('/users', users);
// api.route('/environments', environments);
// api.route('/domains', domains);
// api.route('/crons', crons);

app.route('/api', api);

// Start server
const port = parseInt(process.env.PORT || '3000');
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('DATABASE_URL environment variable not set');
  process.exit(1);
}

// Initialize database
initDb(dbUrl);

console.log(`OpenWorkers API starting on port ${port}...`);
console.log(`Database: ${dbUrl.split('@')[1] || 'configured'}`);
console.log(`JWT secret: ${process.env.JWT_ACCESS_SECRET ? 'configured' : 'MISSING!'}`);

export default {
  port,
  fetch: app.fetch,
};
