import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { kvService } from '$lib/services/kv';

// GET /api/v1/kv/:id/data - List keys with pagination and search
export const GET: RequestHandler = async ({ locals, params, url }) => {
  const userId = locals.userId;
  const idOrName = params.id;
  const prefix = url.searchParams.get('prefix') ?? undefined;
  const cursor = url.searchParams.get('cursor') ?? undefined;
  const limit = url.searchParams.get('limit');

  try {
    const namespace = await kvService.findByIdOrName(userId, idOrName);

    if (!namespace) {
      return json({ error: 'KV namespace not found' }, { status: 404 });
    }

    const result = await kvService.listData(namespace.id, {
      prefix,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined
    });

    return json(result);
  } catch (error) {
    console.error('Failed to list KV data:', error);
    return json({ error: 'Failed to list KV data' }, { status: 500 });
  }
};
