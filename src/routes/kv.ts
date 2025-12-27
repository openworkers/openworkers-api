import { Hono } from 'hono';
import { kvService } from '../services/kv';
import { KvNamespaceSchema, KvNamespaceCreateInputSchema, KvNamespaceUpdateInputSchema } from '../types';
import { jsonResponse, jsonArrayResponse } from '../utils/validate';

const kv = new Hono();

// GET /kv - List all KV namespaces for current user
kv.get('/', async (c) => {
  const userId = c.get('userId');

  try {
    const namespaces = await kvService.findAll(userId);
    return jsonArrayResponse(c, KvNamespaceSchema, namespaces);
  } catch (error) {
    console.error('Failed to fetch KV namespaces:', error);
    return c.json({ error: 'Failed to fetch KV namespaces' }, 500);
  }
});

// GET /kv/:id - Get single KV namespace
kv.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  try {
    const namespace = await kvService.findById(userId, id);

    if (!namespace) {
      return c.json({ error: 'KV namespace not found' }, 404);
    }

    return jsonResponse(c, KvNamespaceSchema, namespace);
  } catch (error) {
    console.error('Failed to fetch KV namespace:', error);
    return c.json({ error: 'Failed to fetch KV namespace' }, 500);
  }
});

// POST /kv - Create new KV namespace
kv.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  try {
    const payload = KvNamespaceCreateInputSchema.parse(body);
    const namespace = await kvService.create(userId, payload);

    return jsonResponse(c, KvNamespaceSchema, namespace, 201);
  } catch (error) {
    console.error('Failed to create KV namespace:', error);
    return c.json(
      {
        error: 'Failed to create KV namespace',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      error instanceof Error && error.message.includes('limit') ? 403 : 500
    );
  }
});

// PATCH /kv/:id - Update KV namespace
kv.patch('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = await c.req.json();

  try {
    const payload = KvNamespaceUpdateInputSchema.parse(body);
    const namespace = await kvService.update(userId, id, payload);

    if (!namespace) {
      return c.json({ error: 'KV namespace not found' }, 404);
    }

    return jsonResponse(c, KvNamespaceSchema, namespace);
  } catch (error) {
    console.error('Failed to update KV namespace:', error);
    return c.json(
      {
        error: 'Failed to update KV namespace',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

// DELETE /kv/:id - Delete KV namespace
kv.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  try {
    const deleted = await kvService.delete(userId, id);

    if (!deleted) {
      return c.json({ error: 'KV namespace not found' }, 404);
    }

    return c.json({ deleted: true });
  } catch (error) {
    console.error('Failed to delete KV namespace:', error);
    return c.json({ error: 'Failed to delete KV namespace' }, 500);
  }
});

export default kv;
