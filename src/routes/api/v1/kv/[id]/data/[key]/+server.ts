import type { RequestHandler } from './$types';
import { kvService } from '#lib/services/kv.ts';
import { serviceErrorResponse } from '#lib/server/validate.ts';
import { ServiceError } from '#lib/services/errors.ts';

// PUT /api/v1/kv/:id/data/:key - Create or update a key
export const PUT: RequestHandler = async ({ locals, params, request }) => {
  const userId = locals.userId;
  const idOrName = params.id;
  const key = params.key;
  const body = await request.json();

  try {
    const namespace = await kvService.findByIdOrName(userId, idOrName);

    if (!namespace) {
      return Response.json({ error: 'KV namespace not found' }, { status: 404 });
    }

    const { value, expiresIn } = body;

    if (value === undefined) {
      return Response.json({ error: 'Value is required' }, { status: 400 });
    }

    const result = await kvService.putData(namespace.id, key, value, expiresIn);
    return Response.json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return serviceErrorResponse(error, 'Failed to put KV data');
    }

    console.error('Failed to put KV data:', error);
    return Response.json({ error: 'Failed to put KV data' }, { status: 500 });
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
      return Response.json({ error: 'KV namespace not found' }, { status: 404 });
    }

    const deleted = await kvService.deleteData(namespace.id, key);

    if (!deleted) {
      return Response.json({ error: 'Key not found' }, { status: 404 });
    }

    return Response.json({ deleted: true });
  } catch (error) {
    console.error('Failed to delete KV data:', error);
    return Response.json({ error: 'Failed to delete KV data' }, { status: 500 });
  }
};
