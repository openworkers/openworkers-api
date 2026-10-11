import type { RequestHandler } from './$types';
import { storageService } from '#lib/services/storage.ts';
import { StorageConfigSchema, StorageConfigCreateInputSchema } from '#lib/types/index.ts';
import { jsonResponse, jsonArrayResponse, parseAndValidate, serviceErrorResponse } from '#lib/server/validate.ts';
import { ServiceError } from '#lib/services/errors.ts';

// GET /api/v1/storage - List all storage configs for current user
export const GET: RequestHandler = async ({ locals }) => {
  const userId = locals.userId;

  try {
    const configs = await storageService.findAll(userId);
    return jsonArrayResponse(StorageConfigSchema, configs);
  } catch (error) {
    console.error('Failed to fetch storage configs:', error);
    return Response.json({ error: 'Failed to fetch storage configs' }, { status: 500 });
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
    if (error instanceof ServiceError) {
      return serviceErrorResponse(error, 'Failed to create storage config');
    }

    console.error('Failed to create storage config:', error);
    return Response.json(
      { error: 'Failed to create storage config', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
