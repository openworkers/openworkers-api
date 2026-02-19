import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { databasesService } from '$lib/services/databases';
import { DatabaseSchema } from '$lib/types';
import { jsonResponse, parseAndValidate } from '$lib/server/validate';

// GET /api/v1/databases/:id - Get single database (accepts UUID or name)
export const GET: RequestHandler = async ({ locals, params }) => {
  const userId = locals.userId;
  const idOrName = params.id;

  try {
    const db = await databasesService.findByIdOrName(userId, idOrName);

    if (!db) {
      return json({ error: 'Database not found' }, { status: 404 });
    }

    return jsonResponse(DatabaseSchema, db);
  } catch (error) {
    console.error('Failed to fetch database:', error);
    return json({ error: 'Failed to fetch database' }, { status: 500 });
  }
};

const UpdateSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  desc: z.string().max(255).trim().nullable().optional(),
  maxRows: z.number().int().positive().max(10000).optional(),
  timeoutSeconds: z.number().int().positive().max(300).optional()
});

// PATCH /api/v1/databases/:id - Update database (accepts UUID or name)
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
  const userId = locals.userId;
  const idOrName = params.id;
  const payload = await parseAndValidate(request, UpdateSchema);

  try {
    const existing = await databasesService.findByIdOrName(userId, idOrName);

    if (!existing) {
      return json({ error: 'Database not found' }, { status: 404 });
    }

    const db = await databasesService.update(userId, existing.id, payload);

    if (!db) {
      return json({ error: 'Database not found' }, { status: 404 });
    }

    return jsonResponse(DatabaseSchema, db);
  } catch (error) {
    console.error('Failed to update database:', error);
    return json({ error: 'Failed to update database' }, { status: 500 });
  }
};

// DELETE /api/v1/databases/:id - Delete database (accepts UUID or name)
export const DELETE: RequestHandler = async ({ locals, params }) => {
  const userId = locals.userId;
  const idOrName = params.id;

  try {
    const existing = await databasesService.findByIdOrName(userId, idOrName);

    if (!existing) {
      return json({ error: 'Database not found' }, { status: 404 });
    }

    const deleted = await databasesService.delete(userId, existing.id);

    if (!deleted) {
      return json({ error: 'Database not found' }, { status: 404 });
    }

    return json({ deleted: true });
  } catch (error) {
    console.error('Failed to delete database:', error);
    return json({ error: 'Failed to delete database' }, { status: 500 });
  }
};
