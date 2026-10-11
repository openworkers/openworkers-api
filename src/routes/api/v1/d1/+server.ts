import type { RequestHandler } from './$types';
import { d1Service } from '#lib/services/d1.ts';
import { D1DatabaseSchema, D1DatabaseCreateInputSchema } from '#lib/types/index.ts';
import { jsonResponse, jsonArrayResponse, parseAndValidate, serviceErrorResponse } from '#lib/server/validate.ts';
import { ServiceError } from '#lib/services/errors.ts';

// GET /api/v1/d1 - List the D1 databases of the current user
export const GET: RequestHandler = async ({ locals }) => {
  try {
    return jsonArrayResponse(D1DatabaseSchema, await d1Service.findAll(locals.userId));
  } catch (error) {
    console.error('Failed to fetch D1 databases:', error);
    return Response.json({ error: 'Failed to fetch D1 databases' }, { status: 500 });
  }
};

// POST /api/v1/d1 - Create a D1 database
export const POST: RequestHandler = async ({ locals, request }) => {
  const payload = await parseAndValidate(request, D1DatabaseCreateInputSchema);

  try {
    return jsonResponse(D1DatabaseSchema, await d1Service.create(locals.userId, payload), 201);
  } catch (error) {
    if (error instanceof ServiceError) {
      return serviceErrorResponse(error, 'Failed to create D1 database');
    }

    console.error('Failed to create D1 database:', error);
    return Response.json({ error: 'Failed to create D1 database' }, { status: 500 });
  }
};
