import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { tablesService } from '$lib/services/tables';

// GET /api/v1/databases/:id/tables/:tableName - Get table info
export const GET: RequestHandler = async ({ locals, params }) => {
  const userId = locals.userId;
  const databaseId = params.id;
  const tableName = params.tableName;

  try {
    const columns = await tablesService.describeTable(userId, databaseId, tableName);

    if (columns.length === 0) {
      return json({ error: 'Table not found' }, { status: 404 });
    }

    return json({ name: tableName, columns });
  } catch (error) {
    console.error('Failed to describe table:', error);

    if (error instanceof Error && error.message === 'Database not found') {
      return json({ error: 'Database not found' }, { status: 404 });
    }

    return json(
      { error: 'Failed to describe table', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};

// DELETE /api/v1/databases/:id/tables/:tableName - Drop a table
export const DELETE: RequestHandler = async ({ locals, params }) => {
  const userId = locals.userId;
  const databaseId = params.id;
  const tableName = params.tableName;

  try {
    await tablesService.dropTable(userId, databaseId, tableName);
    return json({ deleted: true });
  } catch (error) {
    console.error('Failed to drop table:', error);

    if (error instanceof Error && error.message === 'Database not found') {
      return json({ error: 'Database not found' }, { status: 404 });
    }

    return json(
      { error: 'Failed to drop table', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
