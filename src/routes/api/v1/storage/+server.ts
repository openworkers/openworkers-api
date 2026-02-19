import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { storageService } from '$lib/services/storage';
import { StorageConfigSchema, StorageConfigCreateInputSchema } from '$lib/types';
import { jsonResponse, jsonArrayResponse, parseAndValidate } from '$lib/server/validate';

// GET /api/v1/storage - List all storage configs for current user
export const GET: RequestHandler = async ({ locals }) => {
  const userId = locals.userId;

  try {
    const configs = await storageService.findAll(userId);
    return jsonArrayResponse(StorageConfigSchema, configs);
  } catch (error) {
    console.error('Failed to fetch storage configs:', error);
    return json({ error: 'Failed to fetch storage configs' }, { status: 500 });
  }
};

// POST /api/v1/storage - Create new storage config
export const POST: RequestHandler = async ({ locals, request }) => {
  const userId = locals.userId;
  const payload = await parseAndValidate(request, StorageConfigCreateInputSchema);

  try {
    const config = await storageService.create(userId, payload);
    return jsonResponse(StorageConfigSchema, config, 201);
  } catch (error) {
    console.error('Failed to create storage config:', error);
    return json(
      { error: 'Failed to create storage config', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: error instanceof Error && error.message.includes('limit') ? 403 : 500 }
    );
  }
};
