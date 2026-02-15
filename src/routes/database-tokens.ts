import { Hono } from 'hono';
import { z, ZodError } from 'zod';
import { createDatabaseToken, listDatabaseTokens, deleteDatabaseToken } from '../services/db/database-tokens';
import { findDatabaseById, findDatabaseByName } from '../services/db/databases';
import { DatabaseOperations } from '../types/schemas/database-token.schema';

const databaseTokens = new Hono();

// Schema for creating a database token
const CreateTokenSchema = z.object({
  name: z.string().min(1).max(100),
  allowedOperations: z.array(z.enum(DatabaseOperations)).min(1).default(['SELECT', 'INSERT', 'UPDATE', 'DELETE'])
});

// Helper to find database by ID or name
async function findDatabase(userId: string, idOrName: string) {
  // Try UUID first
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(idOrName)) {
    return findDatabaseById(userId, idOrName);
  }

  return findDatabaseByName(userId, idOrName);
}

// GET /databases/:id/tokens - List tokens for a database
databaseTokens.get('/:id/tokens', async (c) => {
  try {
    const userId = c.get('userId');
    const idOrName = c.req.param('id');

    // Verify database ownership
    const database = await findDatabase(userId, idOrName);

    if (!database) {
      return c.json({ error: 'Database not found' }, 404);
    }

    const tokens = await listDatabaseTokens(database.id);

    return c.json(
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
    return c.json({ error: 'Failed to list database tokens' }, 500);
  }
});

// POST /databases/:id/tokens - Create a new token
databaseTokens.post('/:id/tokens', async (c) => {
  try {
    const userId = c.get('userId');
    const idOrName = c.req.param('id');
    const body = await c.req.json();
    const input = CreateTokenSchema.parse(body);

    // Verify database ownership
    const database = await findDatabase(userId, idOrName);

    if (!database) {
      return c.json({ error: 'Database not found' }, 404);
    }

    const { token, fullToken } = await createDatabaseToken(database.id, input.name, input.allowedOperations);

    // Return the full token - this is the ONLY time it's available
    return c.json(
      {
        id: token.id,
        databaseId: token.databaseId,
        name: token.name,
        tokenPrefix: token.tokenPrefix,
        token: fullToken, // Full token - user must save this!
        allowedOperations: token.allowedOperations,
        createdAt: token.createdAt
      },
      201
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return c.json({ error: 'Invalid input', details: error.issues }, 400);
    }

    // Handle unique constraint violation (duplicate name)
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return c.json({ error: 'A token with this name already exists for this database' }, 409);
    }

    console.error('Failed to create database token:', error);
    return c.json({ error: 'Failed to create database token' }, 500);
  }
});

// DELETE /databases/:id/tokens/:tokenId - Delete a token
databaseTokens.delete('/:id/tokens/:tokenId', async (c) => {
  try {
    const userId = c.get('userId');
    const idOrName = c.req.param('id');
    const tokenId = c.req.param('tokenId');

    // Verify database ownership
    const database = await findDatabase(userId, idOrName);

    if (!database) {
      return c.json({ error: 'Database not found' }, 404);
    }

    const deleted = await deleteDatabaseToken(database.id, tokenId);

    if (!deleted) {
      return c.json({ error: 'Token not found' }, 404);
    }

    return c.json({ message: 'Token deleted' });
  } catch (error) {
    console.error('Failed to delete database token:', error);
    return c.json({ error: 'Failed to delete database token' }, 500);
  }
});

export default databaseTokens;
