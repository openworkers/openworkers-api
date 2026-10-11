import type { RequestHandler } from './$types';
import { deleteDatabaseToken } from '#lib/services/db/database-tokens.ts';
import { findDatabaseById, findDatabaseByName } from '#lib/services/db/databases.ts';

async function findDatabase(userId: string, idOrName: string) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(idOrName)) {
    return findDatabaseById(userId, idOrName);
  }

  return findDatabaseByName(userId, idOrName);
}

// DELETE /api/v1/databases/:id/tokens/:tokenId - Delete a token
export const DELETE: RequestHandler = async ({ locals, params }) => {
  try {
    const userId = locals.userId;
    const idOrName = params.id;
    const tokenId = params.tokenId;

    const database = await findDatabase(userId, idOrName);

    if (!database) {
      return Response.json({ error: 'Database not found' }, { status: 404 });
    }

    const deleted = await deleteDatabaseToken(database.id, tokenId);

    if (!deleted) {
      return Response.json({ error: 'Token not found' }, { status: 404 });
    }

    return Response.json({ message: 'Token deleted' });
  } catch (error) {
    console.error('Failed to delete database token:', error);
    return Response.json({ error: 'Failed to delete database token' }, { status: 500 });
  }
};
