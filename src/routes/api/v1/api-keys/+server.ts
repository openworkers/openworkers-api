import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { createApiKey, listApiKeys } from '$lib/services/db/api-keys';
import { parseAndValidate } from '$lib/server/validate';

const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresAt: z.iso.datetime().optional()
});

// POST /api/v1/api-keys - Create a new API key
export const POST: RequestHandler = async ({ locals, request }) => {
  try {
    const userId = locals.userId;
    const input = await parseAndValidate(request, CreateApiKeySchema);

    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;
    const { apiKey, token } = await createApiKey(userId, input.name, expiresAt);

    return json(
      {
        id: apiKey.id,
        name: apiKey.name,
        tokenPrefix: apiKey.tokenPrefix,
        token,
        expiresAt: apiKey.expiresAt ?? null,
        createdAt: apiKey.createdAt
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create API key:', error);
    return json({ error: 'Failed to create API key' }, { status: 500 });
  }
};

// GET /api/v1/api-keys - List user's API keys
export const GET: RequestHandler = async ({ locals }) => {
  try {
    const userId = locals.userId;
    const keys = await listApiKeys(userId);

    return json(
      keys.map((key) => ({
        id: key.id,
        name: key.name,
        tokenPrefix: key.tokenPrefix,
        lastUsedAt: key.lastUsedAt ?? null,
        expiresAt: key.expiresAt ?? null,
        createdAt: key.createdAt
      }))
    );
  } catch (error) {
    console.error('Failed to list API keys:', error);
    return json({ error: 'Failed to list API keys' }, { status: 500 });
  }
};
