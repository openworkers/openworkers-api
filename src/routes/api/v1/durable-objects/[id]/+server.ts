import type { RequestHandler } from './$types';
import { durableObjectsService } from '#lib/services/durable-objects.ts';
import { DurableObjectNamespaceSchema } from '#lib/types/index.ts';
import { jsonResponse, serviceErrorResponse } from '#lib/server/validate.ts';
import { ServiceError } from '#lib/services/errors.ts';

// GET /api/v1/durable-objects/:id - Get a namespace (accepts UUID or name)
export const GET: RequestHandler = async ({ locals, params }) => {
  try {
    const namespace = await durableObjectsService.findByIdOrName(locals.userId, params.id);

    if (!namespace) {
      return Response.json({ error: 'Durable Object namespace not found' }, { status: 404 });
    }

    return jsonResponse(DurableObjectNamespaceSchema, namespace);
  } catch (error) {
    console.error('Failed to fetch Durable Object namespace:', error);
    return Response.json({ error: 'Failed to fetch Durable Object namespace' }, { status: 500 });
  }
};

// DELETE /api/v1/durable-objects/:id - Delete a namespace and the storage of its objects (accepts UUID or name)
export const DELETE: RequestHandler = async ({ locals, params }) => {
  try {
    const namespace = await durableObjectsService.findByIdOrName(locals.userId, params.id);

    if (!namespace || !(await durableObjectsService.delete(locals.userId, namespace.id))) {
      return Response.json({ error: 'Durable Object namespace not found' }, { status: 404 });
    }

    return Response.json({ deleted: true });
  } catch (error) {
    if (error instanceof ServiceError) {
      return serviceErrorResponse(error, 'Failed to delete Durable Object namespace');
    }

    console.error('Failed to delete Durable Object namespace:', error);
    return Response.json({ error: 'Failed to delete Durable Object namespace' }, { status: 500 });
  }
};
