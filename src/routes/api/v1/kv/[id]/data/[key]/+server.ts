import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { kvService } from '$lib/services/kv';

// PUT /api/v1/kv/:id/data/:key - Create or update a key
export const PUT: RequestHandler = async ({ locals, params, request }) => {
  const userId = locals.userId;
  const idOrName = params.id;
  const key = params.key;
  const body = await request.json();

  try {
    const namespace = await kvService.findByIdOrName(userId, idOrName);

    if (!namespace) {
      return json({ error: 'KV namespace not found' }, { status: 404 });
    }

    const { value, expiresIn } = body;

    if (value === undefined) {
      return json({ error: 'Value is required' }, { status: 400 });
    }

    const valueSize = JSON.stringify(value).length;
    const MAX_VALUE_SIZE = 100 * 1024;

    if (valueSize > MAX_VALUE_SIZE) {
      return json({ error: `Value too large: ${valueSize} bytes (max ${MAX_VALUE_SIZE} bytes)` }, { status: 400 });
    }

    const result = await kvService.putData(namespace.id, key, value, expiresIn);
    return json(result);
  } catch (error) {
    console.error('Failed to put KV data:', error);
    return json({ error: 'Failed to put KV data' }, { status: 500 });
  }
};

// DELETE /api/v1/kv/:id/data/:key - Delete a key
export const DELETE: RequestHandler = async ({ locals, params }) => {
  const userId = locals.userId;
  const idOrName = params.id;
  const key = params.key;

  try {
    const namespace = await kvService.findByIdOrName(userId, idOrName);

    if (!namespace) {
      return json({ error: 'KV namespace not found' }, { status: 404 });
    }

    const deleted = await kvService.deleteData(namespace.id, key);

    if (!deleted) {
      return json({ error: 'Key not found' }, { status: 404 });
    }

    return json({ deleted: true });
  } catch (error) {
    console.error('Failed to delete KV data:', error);
    return json({ error: 'Failed to delete KV data' }, { status: 500 });
  }
};
