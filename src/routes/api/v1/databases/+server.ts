import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { databasesService } from '$lib/services/databases';
import { DatabaseSchema, DatabaseCreateInputSchema } from '$lib/types';
import { jsonResponse, jsonArrayResponse, parseAndValidate } from '$lib/server/validate';

// GET /api/v1/databases - List all databases for current user
export const GET: RequestHandler = async ({ locals }) => {
  const userId = locals.userId;

  try {
    const dbs = await databasesService.findAll(userId);
    return jsonArrayResponse(DatabaseSchema, dbs);
  } catch (error) {
    console.error('Failed to fetch databases:', error);
    return json({ error: 'Failed to fetch databases' }, { status: 500 });
  }
};

// POST /api/v1/databases - Create new database
export const POST: RequestHandler = async ({ locals, request }) => {
  const userId = locals.userId;
  const payload = await parseAndValidate(request, DatabaseCreateInputSchema);

  try {
    const db = await databasesService.create(userId, payload);
    return jsonResponse(DatabaseSchema, db, 201);
  } catch (error) {
    console.error('Failed to create database:', error);
    return json(
      { error: 'Failed to create database', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
