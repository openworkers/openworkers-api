import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { kvService } from '$lib/services/kv';
import { KvNamespaceSchema, KvNamespaceUpdateInputSchema } from '$lib/types';
import { jsonResponse, parseAndValidate } from '$lib/server/validate';

// GET /api/v1/kv/:id - Get single KV namespace (accepts UUID or name)
export const GET: RequestHandler = async ({ locals, params }) => {
  const userId = locals.userId;
  const idOrName = params.id;

  try {
    const namespace = await kvService.findByIdOrName(userId, idOrName);

    if (!namespace) {
      return json({ error: 'KV namespace not found' }, { status: 404 });
    }

    return jsonResponse(KvNamespaceSchema, namespace);
  } catch (error) {
    console.error('Failed to fetch KV namespace:', error);
    return json({ error: 'Failed to fetch KV namespace' }, { status: 500 });
  }
};

// PATCH /api/v1/kv/:id - Update KV namespace (accepts UUID or name)
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
  const userId = locals.userId;
  const idOrName = params.id;
  const payload = await parseAndValidate(request, KvNamespaceUpdateInputSchema);

  try {
    const existing = await kvService.findByIdOrName(userId, idOrName);

    if (!existing) {
      return json({ error: 'KV namespace not found' }, { status: 404 });
    }

    const namespace = await kvService.update(userId, existing.id, payload);

    if (!namespace) {
      return json({ error: 'KV namespace not found' }, { status: 404 });
    }

    return jsonResponse(KvNamespaceSchema, namespace);
  } catch (error) {
    console.error('Failed to update KV namespace:', error);
    return json(
      { error: 'Failed to update KV namespace', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};

// DELETE /api/v1/kv/:id - Delete KV namespace (accepts UUID or name)
export const DELETE: RequestHandler = async ({ locals, params }) => {
  const userId = locals.userId;
  const idOrName = params.id;

  try {
    const existing = await kvService.findByIdOrName(userId, idOrName);

    if (!existing) {
      return json({ error: 'KV namespace not found' }, { status: 404 });
    }

    const deleted = await kvService.delete(userId, existing.id);

    if (!deleted) {
      return json({ error: 'KV namespace not found' }, { status: 404 });
    }

    return json({ deleted: true });
  } catch (error) {
    console.error('Failed to delete KV namespace:', error);
    return json({ error: 'Failed to delete KV namespace' }, { status: 500 });
  }
};
