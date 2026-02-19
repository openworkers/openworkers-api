import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { storageService } from '$lib/services/storage';
import { StorageConfigSchema, StorageConfigUpdateInputSchema } from '$lib/types';
import { jsonResponse, parseAndValidate } from '$lib/server/validate';

// GET /api/v1/storage/:id - Get single storage config (accepts UUID or name)
export const GET: RequestHandler = async ({ locals, params }) => {
  const userId = locals.userId;
  const idOrName = params.id;

  try {
    const config = await storageService.findByIdOrName(userId, idOrName);

    if (!config) {
      return json({ error: 'Storage config not found' }, { status: 404 });
    }

    return jsonResponse(StorageConfigSchema, config);
  } catch (error) {
    console.error('Failed to fetch storage config:', error);
    return json({ error: 'Failed to fetch storage config' }, { status: 500 });
  }
};

// PATCH /api/v1/storage/:id - Update storage config (accepts UUID or name)
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
  const userId = locals.userId;
  const idOrName = params.id;
  const payload = await parseAndValidate(request, StorageConfigUpdateInputSchema);

  try {
    const existing = await storageService.findByIdOrName(userId, idOrName);

    if (!existing) {
      return json({ error: 'Storage config not found' }, { status: 404 });
    }

    const config = await storageService.update(userId, existing.id, payload);

    if (!config) {
      return json({ error: 'Storage config not found' }, { status: 404 });
    }

    return jsonResponse(StorageConfigSchema, config);
  } catch (error) {
    console.error('Failed to update storage config:', error);
    return json(
      { error: 'Failed to update storage config', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};

// DELETE /api/v1/storage/:id - Delete storage config (accepts UUID or name)
export const DELETE: RequestHandler = async ({ locals, params }) => {
  const userId = locals.userId;
  const idOrName = params.id;

  try {
    const existing = await storageService.findByIdOrName(userId, idOrName);

    if (!existing) {
      return json({ error: 'Storage config not found' }, { status: 404 });
    }

    const deleted = await storageService.delete(userId, existing.id);

    if (!deleted) {
      return json({ error: 'Storage config not found' }, { status: 404 });
    }

    return json({ deleted: true });
  } catch (error) {
    console.error('Failed to delete storage config:', error);
    return json({ error: 'Failed to delete storage config' }, { status: 500 });
  }
};
