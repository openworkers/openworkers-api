import { Hono } from 'hono';
import { databasesService } from '../services/databases';
import { DatabaseSchema, DatabaseCreateInputSchema } from '../types';
import { jsonResponse, jsonArrayResponse } from '../utils/validate';
import { z } from 'zod';
import tables from './tables';

const databases = new Hono();

// Mount tables sub-routes
databases.route('/:databaseId/tables', tables);

// GET /databases - List all databases for current user
databases.get('/', async (c) => {
  const userId = c.get('userId');

  try {
    const dbs = await databasesService.findAll(userId);
    return jsonArrayResponse(c, DatabaseSchema, dbs);
  } catch (error) {
    console.error('Failed to fetch databases:', error);
    return c.json({ error: 'Failed to fetch databases' }, 500);
  }
});

// GET /databases/:id - Get single database
databases.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  try {
    const db = await databasesService.findById(userId, id);

    if (!db) {
      return c.json({ error: 'Database not found' }, 404);
    }

    return jsonResponse(c, DatabaseSchema, db);
  } catch (error) {
    console.error('Failed to fetch database:', error);
    return c.json({ error: 'Failed to fetch database' }, 500);
  }
});

// POST /databases - Create new database
databases.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  try {
    const payload = DatabaseCreateInputSchema.parse(body);
    const db = await databasesService.create(userId, payload);
    return jsonResponse(c, DatabaseSchema, db, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: 'Validation error',
          details: error.issues
        },
        400
      );
    }

    console.error('Failed to create database:', error);
    return c.json(
      {
        error: 'Failed to create database',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

// PATCH /databases/:id - Update database
databases.patch('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = await c.req.json();

  const UpdateSchema = z.object({
    name: z.string().min(1).max(100).trim().optional(),
    desc: z.string().max(255).trim().nullable().optional(),
    maxRows: z.number().int().positive().max(10000).optional(),
    timeoutSeconds: z.number().int().positive().max(300).optional()
  });

  try {
    const payload = UpdateSchema.parse(body);
    const db = await databasesService.update(userId, id, payload);

    if (!db) {
      return c.json({ error: 'Database not found' }, 404);
    }

    return jsonResponse(c, DatabaseSchema, db);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: 'Validation error',
          details: error.issues
        },
        400
      );
    }

    console.error('Failed to update database:', error);
    return c.json({ error: 'Failed to update database' }, 500);
  }
});

// DELETE /databases/:id - Delete database
databases.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  try {
    const deleted = await databasesService.delete(userId, id);

    if (!deleted) {
      return c.json({ error: 'Database not found' }, 404);
    }

    return c.json({ deleted: true });
  } catch (error) {
    console.error('Failed to delete database:', error);
    return c.json({ error: 'Failed to delete database' }, 500);
  }
});

export default databases;
