import { Hono } from 'hono';
import { environmentsService } from '../services/environments';
import { EnvironmentCreateInputSchema, EnvironmentUpdateInputSchema, EnvironmentSchema } from '../types';
import { jsonResponse, jsonArrayResponse } from '../utils/validate';

const environments = new Hono();

// GET /environments - List all environments
environments.get('/', async (c) => {
  const userId = c.get('userId');
  try {
    const envs = await environmentsService.findAll(userId);
    return jsonArrayResponse(c, EnvironmentSchema, envs);
  } catch (error) {
    console.error('Failed to fetch environments:', error);
    return c.json({ error: 'Failed to fetch environments' }, 500);
  }
});

// GET /environments/:id - Get environment by id
environments.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  try {
    const env = await environmentsService.findById(userId, id);
    if (!env) {
      return c.json({ error: 'Environment not found' }, 404);
    }
    // Values are already included in findById now
    return jsonResponse(c, EnvironmentSchema, env);
  } catch (error) {
    console.error('Failed to fetch environment:', error);
    return c.json({ error: 'Failed to fetch environment' }, 500);
  }
});

// POST /environments - Create environment
environments.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  try {
    const payload = EnvironmentCreateInputSchema.parse(body);
    const env = await environmentsService.create(userId, payload);
    return jsonResponse(c, EnvironmentSchema, env, 201);
  } catch (error) {
    console.error('Failed to create environment:', error);
    return c.json({ error: 'Failed to create environment' }, 500);
  }
});

// PATCH /environments/:id - Update environment
environments.patch('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = await c.req.json();

  try {
    const payload = EnvironmentUpdateInputSchema.parse({ ...body, id }); // Schema requires ID

    // Update name/desc if provided
    let env;
    if (payload.name) {
      env = await environmentsService.update(userId, id, payload);
    } else {
      env = await environmentsService.findById(userId, id);
    }

    if (!env) {
      return c.json({ error: 'Environment not found' }, 404);
    }

    // Update values if provided
    if (payload.values && Array.isArray(payload.values)) {
      await environmentsService.updateValues(userId, id, payload.values);
    }

    // Reload to get fresh state (with values included)
    const updatedEnv = await environmentsService.findById(userId, id);

    return jsonResponse(c, EnvironmentSchema, updatedEnv);
  } catch (error) {
    console.error('Failed to update environment:', error);
    return c.json(
      {
        error: 'Failed to update environment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

// DELETE /environments/:id - Delete environment
environments.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  try {
    const deleted = await environmentsService.delete(userId, id);
    if (deleted === 0) {
      return c.json({ error: 'Environment not found' }, 404);
    }
    return c.json({ deleted });
  } catch (error) {
    console.error('Failed to delete environment:', error);
    return c.json({ error: 'Failed to delete environment' }, 500);
  }
});

export default environments;
