import type { RequestHandler } from './$types';
import { d1Service } from '#lib/services/d1.ts';
import { D1RequestSchema } from '#lib/types/index.ts';
import { parseAndValidate, serviceErrorResponse } from '#lib/server/validate.ts';
import { ServiceError } from '#lib/services/errors.ts';

// POST /api/v1/d1/:id/requests - Run a D1 operation or migration through the runner (accepts UUID or name).
// A D1 error is a result like any other (result.type is "error"), so the status is 200.
export const POST: RequestHandler = async ({ locals, params, request }) => {
  const payload = await parseAndValidate(request, D1RequestSchema);

  try {
    const database = await d1Service.findByIdOrName(locals.userId, params.id);

    if (!database) {
      return Response.json({ error: 'D1 database not found' }, { status: 404 });
    }

    return Response.json(await d1Service.request(database.id, payload));
  } catch (error) {
    if (error instanceof ServiceError) {
      return serviceErrorResponse(error, 'Failed to run the D1 request');
    }

    console.error('Failed to run the D1 request:', error);
    return Response.json({ error: 'Failed to run the D1 request' }, { status: 500 });
  }
};
