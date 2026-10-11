import type { RequestHandler } from './$types';
import { databasesService } from '#lib/services/databases.ts';
import { DatabaseSchema } from '#lib/types/index.ts';
import { jsonResponse, serviceErrorResponse } from '#lib/server/validate.ts';
import { ServiceError } from '#lib/services/errors.ts';

// GET /api/v1/databases/:id - Get single database (accepts UUID or name)
export const GET: RequestHandler = async ({ locals, params }) => {
  const userId = locals.userId;
  const idOrName = params.id;

  try {
    const db = await databasesService.findByIdOrName(userId, idOrName);

    if (!db) {
      return Response.json({ error: 'Database not found' }, { status: 404 });
    }

    return jsonResponse(DatabaseSchema, db);
  } catch (error) {
    console.error('Failed to fetch database:', error);
    return Response.json({ error: 'Failed to fetch database' }, { status: 500 });
  }
};

// DELETE /api/v1/databases/:id - Delete database (accepts UUID or name)
export const DELETE: RequestHandler = async ({ locals, params }) => {
  const userId = locals.userId;
  const idOrName = params.id;

  try {
    const existing = await databasesService.findByIdOrName(userId, idOrName);

    if (!existing) {
      return Response.json({ error: 'Database not found' }, { status: 404 });
    }

    const deleted = await databasesService.delete(userId, existing.id);

    if (!deleted) {
      return Response.json({ error: 'Database not found' }, { status: 404 });
    }

    return Response.json({ deleted: true });
  } catch (error) {
    if (error instanceof ServiceError) {
      return serviceErrorResponse(error, 'Failed to delete database');
    }

    console.error('Failed to delete database:', error);
    return Response.json({ error: 'Failed to delete database' }, { status: 500 });
  }
};
