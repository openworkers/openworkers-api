import type { RequestHandler } from './$types';
import { deleteApiKey } from '#lib/services/db/api-keys.ts';

// DELETE /api/v1/api-keys/:id - Delete an API key
export const DELETE: RequestHandler = async ({ locals, params }) => {
  try {
    const userId = locals.userId;
    const keyId = params.id;

    const deleted = await deleteApiKey(userId, keyId);

    if (!deleted) {
      return Response.json({ error: 'API key not found' }, { status: 404 });
    }

    return Response.json({ message: 'API key deleted' });
  } catch (error) {
    console.error('Failed to delete API key:', error);
    return Response.json({ error: 'Failed to delete API key' }, { status: 500 });
  }
};
