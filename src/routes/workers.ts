import { Hono } from 'hono';
import { workersService } from '../services/workers';

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

  // Validation
  if (!body.name || !body.script) {
    return c.json({ error: 'Missing required fields: name, script' }, 400);
  }

  if (!['javascript', 'typescript'].includes(body.language)) {
    body.language = 'javascript'; // Default
  }

  try {
    const worker = await workersService.create(userId, {
      name: body.name,
      script: body.script,
      language: body.language,
      environment_id: body.environment_id,
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
    const worker = await workersService.update(userId, id, {
      name: body.name,
      script: body.script,
      language: body.language,
      environment_id: body.environment_id,
    });

    return c.json(worker);
  } catch (error) {
    console.error('Failed to update worker:', error);
    return c.json({
      error: 'Failed to update worker',
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
