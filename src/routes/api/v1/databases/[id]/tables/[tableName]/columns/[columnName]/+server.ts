import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { tablesService } from '$lib/services/tables';

// DELETE /api/v1/databases/:id/tables/:tableName/columns/:columnName - Drop a column
export const DELETE: RequestHandler = async ({ locals, params }) => {
  const userId = locals.userId;
  const databaseId = params.id;
  const tableName = params.tableName;
  const columnName = params.columnName;

  try {
    await tablesService.dropColumn(userId, databaseId, tableName, columnName);
    return json({ deleted: true });
  } catch (error) {
    console.error('Failed to drop column:', error);

    if (error instanceof Error && error.message === 'Database not found') {
      return json({ error: 'Database not found' }, { status: 404 });
    }

    return json(
      { error: 'Failed to drop column', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
