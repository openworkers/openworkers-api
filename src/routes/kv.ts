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

// ============ KV Data Routes ============

// GET /kv/:id/data - List keys with pagination and search
kv.get('/:id/data', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const prefix = c.req.query('prefix');
  const cursor = c.req.query('cursor');
  const limit = c.req.query('limit');

  try {
    // Verify ownership
    const namespace = await kvService.findById(userId, id);

    if (!namespace) {
      return c.json({ error: 'KV namespace not found' }, 404);
    }

    const result = await kvService.listData(id, {
      prefix,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined
    });

    return c.json(result);
  } catch (error) {
    console.error('Failed to list KV data:', error);
    return c.json({ error: 'Failed to list KV data' }, 500);
  }
});

// PUT /kv/:id/data/:key - Create or update a key
kv.put('/:id/data/:key', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const key = c.req.param('key');
  const body = await c.req.json();

  try {
    // Verify ownership
    const namespace = await kvService.findById(userId, id);

    if (!namespace) {
      return c.json({ error: 'KV namespace not found' }, 404);
    }

    const { value, expiresIn } = body;

    if (value === undefined) {
      return c.json({ error: 'Value is required' }, 400);
    }

    // Check value size (100KB limit)
    const valueSize = JSON.stringify(value).length;
    const MAX_VALUE_SIZE = 100 * 1024;

    if (valueSize > MAX_VALUE_SIZE) {
      return c.json({ error: `Value too large: ${valueSize} bytes (max ${MAX_VALUE_SIZE} bytes)` }, 400);
    }

    const result = await kvService.putData(id, key, value, expiresIn);
    return c.json(result);
  } catch (error) {
    console.error('Failed to put KV data:', error);
    return c.json({ error: 'Failed to put KV data' }, 500);
  }
});

// DELETE /kv/:id/data/:key - Delete a key
kv.delete('/:id/data/:key', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const key = c.req.param('key');

  try {
    // Verify ownership
    const namespace = await kvService.findById(userId, id);

    if (!namespace) {
      return c.json({ error: 'KV namespace not found' }, 404);
    }

    const deleted = await kvService.deleteData(id, key);

    if (!deleted) {
      return c.json({ error: 'Key not found' }, 404);
    }

    return c.json({ deleted: true });
  } catch (error) {
    console.error('Failed to delete KV data:', error);
    return c.json({ error: 'Failed to delete KV data' }, 500);
  }
});

export default kv;
