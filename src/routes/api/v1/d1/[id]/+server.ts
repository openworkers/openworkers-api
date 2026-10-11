import type { RequestHandler } from './$types';
import { d1Service } from '#lib/services/d1.ts';
import { D1DatabaseSchema } from '#lib/types/index.ts';
import { jsonResponse, serviceErrorResponse } from '#lib/server/validate.ts';
import { ServiceError } from '#lib/services/errors.ts';

// GET /api/v1/d1/:id - Get a D1 database (accepts UUID or name)
export const GET: RequestHandler = async ({ locals, params }) => {
  try {
    const database = await d1Service.findByIdOrName(locals.userId, params.id);

    if (!database) {
      return Response.json({ error: 'D1 database not found' }, { status: 404 });
    }

    return jsonResponse(D1DatabaseSchema, database);
  } catch (error) {
    console.error('Failed to fetch D1 database:', error);
    return Response.json({ error: 'Failed to fetch D1 database' }, { status: 500 });
  }
};

// DELETE /api/v1/d1/:id - Delete a D1 database (accepts UUID or name); its ID never comes back
export const DELETE: RequestHandler = async ({ locals, params }) => {
  try {
    const database = await d1Service.findByIdOrName(locals.userId, params.id);

    if (!database || !(await d1Service.delete(locals.userId, database.id))) {
      return Response.json({ error: 'D1 database not found' }, { status: 404 });
    }

    return Response.json({ deleted: true });
  } catch (error) {
    if (error instanceof ServiceError) {
      return serviceErrorResponse(error, 'Failed to delete D1 database');
    }

    console.error('Failed to delete D1 database:', error);
    return Response.json({ error: 'Failed to delete D1 database' }, { status: 500 });
  }
};
