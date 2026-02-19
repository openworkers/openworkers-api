import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { tablesService } from '$lib/services/tables';
import { CreateTableInputSchema, type IColumnDefinition } from '$lib/types';
import { parseAndValidate } from '$lib/server/validate';

// GET /api/v1/databases/:id/tables - List all tables
export const GET: RequestHandler = async ({ locals, params }) => {
  const userId = locals.userId;
  const databaseId = params.id;

  try {
    const tableList = await tablesService.listTables(userId, databaseId);
    return json(tableList);
  } catch (error) {
    console.error('Failed to list tables:', error);

    if (error instanceof Error && error.message === 'Database not found') {
      return json({ error: 'Database not found' }, { status: 404 });
    }

    return json(
      { error: 'Failed to list tables', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};

// POST /api/v1/databases/:id/tables - Create a new table
export const POST: RequestHandler = async ({ locals, params, request }) => {
  const userId = locals.userId;
  const databaseId = params.id;
  const { name, columns } = await parseAndValidate(request, CreateTableInputSchema);

  try {
    await tablesService.createTable(userId, databaseId, name, columns as IColumnDefinition[]);

    return json({ created: true, name }, { status: 201 });
  } catch (error) {
    console.error('Failed to create table:', error);

    if (error instanceof Error && error.message === 'Database not found') {
      return json({ error: 'Database not found' }, { status: 404 });
    }

    return json(
      { error: 'Failed to create table', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
