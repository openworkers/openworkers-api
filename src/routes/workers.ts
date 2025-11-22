import { Hono } from 'hono';
import { workersService } from '../services/workers';
import { cronsService } from '../services/crons';
import { WorkerCreateInputSchema, WorkerUpdateInputSchema } from '../types';

const workers = new Hono();

// GET /workers - List all workers for current user
workers.get('/', async (c) => {
  const userId = c.get('userId');

  try {
    const workers = await workersService.findAll(userId);
    return c.json(workers);
  } catch (error) {
    console.error('Failed to fetch workers:', error);
    return c.json({ error: 'Failed to fetch workers' }, 500);
  }
});

// GET /workers/:id - Get single worker
workers.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  try {
    const worker = await workersService.findById(userId, id);

    if (!worker) {
      return c.json({ error: 'Worker not found' }, 404);
    }

    return c.json(worker);
  } catch (error) {
    console.error('Failed to fetch worker:', error);
    return c.json({ error: 'Failed to fetch worker' }, 500);
  }
});

// POST /workers - Create new worker
workers.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  try {
    const payload = WorkerCreateInputSchema.parse(body);

    const worker = await workersService.create(userId, {
      name: payload.name,
      script: payload.script || '', // Default to empty string if not provided
      language: payload.language,
      environmentId: undefined, // TODO: Handle environment mapping if needed
    });

    return c.json(worker, 201);
  } catch (error) {
    console.error('Failed to create worker:', error);
    return c.json({
      error: 'Failed to create worker',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// PUT /workers/:id - Update worker
workers.put('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = await c.req.json();

  try {
    const payload = WorkerUpdateInputSchema.parse(body);

    const _update = await workersService.update(userId, id, payload);

    const updatedWorker = await workersService.findById(userId, id);

    return c.json(updatedWorker);
  } catch (error) {
    console.error('Failed to update worker:', error);
    return c.json({
      error: 'Failed to update worker',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// POST /workers/:id/crons - Create cron for worker
workers.post('/:id/crons', async (c) => {
  const userId = c.get('userId');
  const workerId = c.req.param('id');
  const body = await c.req.json();

  if (!body.expression) {
    return c.json({ error: 'Missing required field: expression' }, 400);
  }

  try {
    // Verify worker exists and belongs to user
    const worker = await workersService.findById(userId, workerId);
    if (!worker) {
      return c.json({ error: 'Worker not found' }, 404);
    }

    await cronsService.create(userId, {
      workerId,
      value: body.expression // Map expression -> value
    });

    // Return updated worker
    const updatedWorker = await workersService.findById(userId, workerId);
    return c.json(updatedWorker, 201);
  } catch (error) {
    console.error('Failed to create cron:', error);
    return c.json({
      error: 'Failed to create cron',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// DELETE /workers/:id - Delete worker
workers.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  try {
    const deleted = await workersService.delete(userId, id);

    if (deleted === 0) {
      return c.json({ error: 'Worker not found' }, 404);
    }

    return c.json({ deleted });
  } catch (error) {
    console.error('Failed to delete worker:', error);
    return c.json({ error: 'Failed to delete worker' }, 500);
  }
});

export default workers;
