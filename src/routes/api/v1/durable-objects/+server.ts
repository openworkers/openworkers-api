import type { RequestHandler } from './$types';
import { durableObjectsService } from '#lib/services/durable-objects.ts';
import { DurableObjectNamespaceSchema, DurableObjectNamespaceCreateInputSchema } from '#lib/types/index.ts';
import { jsonResponse, jsonArrayResponse, parseAndValidate, serviceErrorResponse } from '#lib/server/validate.ts';
import { ServiceError } from '#lib/services/errors.ts';

// GET /api/v1/durable-objects - List the Durable Object namespaces of the current user
export const GET: RequestHandler = async ({ locals }) => {
  try {
    return jsonArrayResponse(DurableObjectNamespaceSchema, await durableObjectsService.findAll(locals.userId));
  } catch (error) {
    console.error('Failed to fetch Durable Object namespaces:', error);
    return Response.json({ error: 'Failed to fetch Durable Object namespaces' }, { status: 500 });
  }
};

// POST /api/v1/durable-objects - Create a namespace for a class that a worker of the user exports
export const POST: RequestHandler = async ({ locals, request }) => {
  const payload = await parseAndValidate(request, DurableObjectNamespaceCreateInputSchema);

  try {
    return jsonResponse(DurableObjectNamespaceSchema, await durableObjectsService.create(locals.userId, payload), 201);
  } catch (error) {
    if (error instanceof ServiceError) {
      return serviceErrorResponse(error, 'Failed to create Durable Object namespace');
    }

    console.error('Failed to create Durable Object namespace:', error);
    return Response.json({ error: 'Failed to create Durable Object namespace' }, { status: 500 });
  }
};
