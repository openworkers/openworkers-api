import { Hono } from 'hono';

import { sql } from '../services/db/client';
import { WasmCron } from '@openworkers/croner-wasm';

const health = new Hono();

// Liveness check
health.get('/', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database connection test
health.get('/database', async (c) => {
  try {
    const result = await sql<{ result: number }>('SELECT 1 + 1 AS result');
    return c.json({ status: 'ok', result: result[0]?.result });
  } catch (error) {
    return c.json({ status: 'error', error: String(error) }, 500);
  }
});

// Cron WASM test
health.get('/cron', (c) => {
  const pattern = c.req.query('pattern') || '*/5 * * * *';

  try {
    const cron = new WasmCron(pattern);
    return c.json({
      status: 'ok',
      wasm: true,
      pattern: cron.pattern(),
      description: cron.describe(),
      nextRun: cron.nextRun()?.toISOString() ?? null,
      nextRuns: cron.nextRuns(5).map((d: Date) => d.toISOString())
    });
  } catch (error) {
    return c.json({ status: 'error', wasm: true, error: String(error) }, 400);
  }
});

// --- Latency endpoints (used by CLI test-latency) ---

// API latency: measures request round-trip through all layers above
health.get('/latency/api', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database latency: measures API + DB round-trip
health.get('/latency/database', async (c) => {
  try {
    const result = await sql<{ now: string }>('SELECT NOW() AS now');
    return c.json({ status: 'ok', timestamp: result[0]?.now });
  } catch (error) {
    return c.json({ status: 'error', error: String(error) }, 500);
  }
});

// Proxy latency: should be intercepted by Nginx before reaching API
// If the CLI receives 418, it means Nginx is not intercepting this path
health.get('/latency/proxy', (c) => {
  return c.json({ status: 'not_intercepted', layer: 'proxy' }, 418);
});

export default health;
