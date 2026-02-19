import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { createDatabaseToken, listDatabaseTokens } from '$lib/services/db/database-tokens';
import { findDatabaseById, findDatabaseByName } from '$lib/services/db/databases';
import { DatabaseOperations } from '$lib/types/schemas/database-token.schema';
import { parseAndValidate } from '$lib/server/validate';

const CreateTokenSchema = z.object({
  name: z.string().min(1).max(100),
  allowedOperations: z.array(z.enum(DatabaseOperations)).min(1).default(['SELECT', 'INSERT', 'UPDATE', 'DELETE'])
});

async function findDatabase(userId: string, idOrName: string) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(idOrName)) {
    return findDatabaseById(userId, idOrName);
  }

  return findDatabaseByName(userId, idOrName);
}

// GET /api/v1/databases/:id/tokens - List tokens for a database
export const GET: RequestHandler = async ({ locals, params }) => {
  try {
    const userId = locals.userId;
    const idOrName = params.id;

    const database = await findDatabase(userId, idOrName);

    if (!database) {
      return json({ error: 'Database not found' }, { status: 404 });
    }

    const tokens = await listDatabaseTokens(database.id);

    return json(
      tokens.map((token) => ({
        id: token.id,
        databaseId: token.databaseId,
        name: token.name,
        tokenPrefix: token.tokenPrefix,
        allowedOperations: token.allowedOperations,
        lastUsedAt: token.lastUsedAt ?? null,
        createdAt: token.createdAt
      }))
    );
  } catch (error) {
    console.error('Failed to list database tokens:', error);
    return json({ error: 'Failed to list database tokens' }, { status: 500 });
  }
};

// POST /api/v1/databases/:id/tokens - Create a new token
export const POST: RequestHandler = async ({ locals, params, request }) => {
  const userId = locals.userId;
  const idOrName = params.id;
  const input = await parseAndValidate(request, CreateTokenSchema);

  try {
    const database = await findDatabase(userId, idOrName);

    if (!database) {
      return json({ error: 'Database not found' }, { status: 404 });
    }

    const { token, fullToken } = await createDatabaseToken(database.id, input.name, input.allowedOperations);

    return json(
      {
        id: token.id,
        databaseId: token.databaseId,
        name: token.name,
        tokenPrefix: token.tokenPrefix,
        token: fullToken,
        allowedOperations: token.allowedOperations,
        createdAt: token.createdAt
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return json({ error: 'A token with this name already exists for this database' }, { status: 409 });
    }

    console.error('Failed to create database token:', error);
    return json({ error: 'Failed to create database token' }, { status: 500 });
  }
};
