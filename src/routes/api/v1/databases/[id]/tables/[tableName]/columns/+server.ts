import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { tablesService } from '$lib/services/tables';
import { ColumnDefinitionSchema } from '$lib/types';
import { parseAndValidate } from '$lib/server/validate';

// POST /api/v1/databases/:id/tables/:tableName/columns - Add a column
export const POST: RequestHandler = async ({ locals, params, request }) => {
  const userId = locals.userId;
  const databaseId = params.id;
  const tableName = params.tableName;
  const column = await parseAndValidate(request, ColumnDefinitionSchema);

  try {
    await tablesService.addColumn(userId, databaseId, tableName, column);
    return json({ created: true, name: column.name }, { status: 201 });
  } catch (error) {
    console.error('Failed to add column:', error);

    if (error instanceof Error && error.message === 'Database not found') {
      return json({ error: 'Database not found' }, { status: 404 });
    }

    return json(
      { error: 'Failed to add column', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
