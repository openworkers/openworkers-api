import { Hono } from 'hono';
import { z, ZodError } from 'zod';
import { createApiKey, listApiKeys, deleteApiKey } from '../services/db/api-keys';

const apiKeys = new Hono();

// Schema for creating an API key
const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresAt: z.string().datetime().optional()
});

// POST /api-keys - Create a new API key
apiKeys.post('/', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const input = CreateApiKeySchema.parse(body);

    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;
    const { apiKey, token } = await createApiKey(userId, input.name, expiresAt);

    // Return the full token - this is the ONLY time it's available
    return c.json(
      {
        id: apiKey.id,
        name: apiKey.name,
        tokenPrefix: apiKey.tokenPrefix,
        token, // Full token - user must save this!
        expiresAt: apiKey.expiresAt?.toISOString() ?? null,
        createdAt: apiKey.createdAt.toISOString()
      },
      201
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return c.json({ error: 'Invalid input', details: error.issues }, 400);
    }

    console.error('Failed to create API key:', error);
    return c.json({ error: 'Failed to create API key' }, 500);
  }
});

// GET /api-keys - List user's API keys
apiKeys.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    const keys = await listApiKeys(userId);

    return c.json(
      keys.map((key) => ({
        id: key.id,
        name: key.name,
        tokenPrefix: key.tokenPrefix,
        lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
        expiresAt: key.expiresAt?.toISOString() ?? null,
        createdAt: key.createdAt.toISOString()
      }))
    );
  } catch (error) {
    console.error('Failed to list API keys:', error);
    return c.json({ error: 'Failed to list API keys' }, 500);
  }
});

// DELETE /api-keys/:id - Delete an API key
apiKeys.delete('/:id', async (c) => {
  try {
    const userId = c.get('userId');
    const keyId = c.req.param('id');

    const deleted = await deleteApiKey(userId, keyId);

    if (!deleted) {
      return c.json({ error: 'API key not found' }, 404);
    }

    return c.json({ message: 'API key deleted' });
  } catch (error) {
    console.error('Failed to delete API key:', error);
    return c.json({ error: 'Failed to delete API key' }, 500);
  }
});

export default apiKeys;
