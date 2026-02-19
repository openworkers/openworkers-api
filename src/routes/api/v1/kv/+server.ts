import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { kvService } from '$lib/services/kv';
import { KvNamespaceSchema, KvNamespaceCreateInputSchema } from '$lib/types';
import { jsonResponse, jsonArrayResponse, parseAndValidate } from '$lib/server/validate';

// GET /api/v1/kv - List all KV namespaces for current user
export const GET: RequestHandler = async ({ locals }) => {
  const userId = locals.userId;

  try {
    const namespaces = await kvService.findAll(userId);
    return jsonArrayResponse(KvNamespaceSchema, namespaces);
  } catch (error) {
    console.error('Failed to fetch KV namespaces:', error);
    return json({ error: 'Failed to fetch KV namespaces' }, { status: 500 });
  }
};

// POST /api/v1/kv - Create new KV namespace
export const POST: RequestHandler = async ({ locals, request }) => {
  const userId = locals.userId;
  const payload = await parseAndValidate(request, KvNamespaceCreateInputSchema);

  try {
    const namespace = await kvService.create(userId, payload);
    return jsonResponse(KvNamespaceSchema, namespace, 201);
  } catch (error) {
    console.error('Failed to create KV namespace:', error);
    return json(
      { error: 'Failed to create KV namespace', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: error instanceof Error && error.message.includes('limit') ? 403 : 500 }
    );
  }
};
