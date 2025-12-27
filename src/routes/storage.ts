import { Hono } from 'hono';
import { storageService } from '../services/storage';
import { StorageConfigSchema, StorageConfigCreateInputSchema, StorageConfigUpdateInputSchema } from '../types';
import { jsonResponse, jsonArrayResponse } from '../utils/validate';

const storage = new Hono();

// GET /storage - List all storage configs for current user
storage.get('/', async (c) => {
  const userId = c.get('userId');

  try {
    const configs = await storageService.findAll(userId);
    return jsonArrayResponse(c, StorageConfigSchema, configs);
  } catch (error) {
    console.error('Failed to fetch storage configs:', error);
    return c.json({ error: 'Failed to fetch storage configs' }, 500);
  }
});

// GET /storage/:id - Get single storage config
storage.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  try {
    const config = await storageService.findById(userId, id);

    if (!config) {
      return c.json({ error: 'Storage config not found' }, 404);
    }

    return jsonResponse(c, StorageConfigSchema, config);
  } catch (error) {
    console.error('Failed to fetch storage config:', error);
    return c.json({ error: 'Failed to fetch storage config' }, 500);
  }
});

// POST /storage - Create new storage config
storage.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  try {
    const payload = StorageConfigCreateInputSchema.parse(body);
    const config = await storageService.create(userId, payload);

    return jsonResponse(c, StorageConfigSchema, config, 201);
  } catch (error) {
    console.error('Failed to create storage config:', error);
    return c.json(
      {
        error: 'Failed to create storage config',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      error instanceof Error && error.message.includes('limit') ? 403 : 500
    );
  }
});

// PATCH /storage/:id - Update storage config
storage.patch('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = await c.req.json();

  try {
    const payload = StorageConfigUpdateInputSchema.parse(body);
    const config = await storageService.update(userId, id, payload);

    if (!config) {
      return c.json({ error: 'Storage config not found' }, 404);
    }

    return jsonResponse(c, StorageConfigSchema, config);
  } catch (error) {
    console.error('Failed to update storage config:', error);
    return c.json(
      {
        error: 'Failed to update storage config',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

// DELETE /storage/:id - Delete storage config
storage.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  try {
    const deleted = await storageService.delete(userId, id);

    if (!deleted) {
      return c.json({ error: 'Storage config not found' }, 404);
    }

    return c.json({ deleted: true });
  } catch (error) {
    console.error('Failed to delete storage config:', error);
    return c.json({ error: 'Failed to delete storage config' }, 500);
  }
});

export default storage;
