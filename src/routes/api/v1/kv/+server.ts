import type { RequestHandler } from './$types';
import { kvService } from '#lib/services/kv.ts';
import { KvNamespaceSchema, KvNamespaceCreateInputSchema } from '#lib/types/index.ts';
import { jsonResponse, jsonArrayResponse, parseAndValidate, serviceErrorResponse } from '#lib/server/validate.ts';
import { ServiceError } from '#lib/services/errors.ts';

// GET /api/v1/kv - List all KV namespaces for current user
export const GET: RequestHandler = async ({ locals }) => {
  const userId = locals.userId;

  try {
    const namespaces = await kvService.findAll(userId);
    return jsonArrayResponse(KvNamespaceSchema, namespaces);
  } catch (error) {
    console.error('Failed to fetch KV namespaces:', error);
    return Response.json({ error: 'Failed to fetch KV namespaces' }, { status: 500 });
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
    if (error instanceof ServiceError) {
      return serviceErrorResponse(error, 'Failed to create KV namespace');
    }

    console.error('Failed to create KV namespace:', error);
    return Response.json(
      { error: 'Failed to create KV namespace', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
