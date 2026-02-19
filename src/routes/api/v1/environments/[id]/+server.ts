import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { environmentsService } from '$lib/services/environments';
import { EnvironmentUpdateInputSchema, EnvironmentSchema } from '$lib/types';
import { jsonResponse } from '$lib/server/validate';

// GET /api/v1/environments/:id - Get environment by id or name
export const GET: RequestHandler = async ({ locals, params }) => {
  const userId = locals.userId;
  const idOrName = params.id;

  try {
    const env = await environmentsService.findByIdOrName(userId, idOrName);

    if (!env) {
      return json({ error: 'Environment not found' }, { status: 404 });
    }

    return jsonResponse(EnvironmentSchema, env);
  } catch (error) {
    console.error('Failed to fetch environment:', error);
    return json({ error: 'Failed to fetch environment' }, { status: 500 });
  }
};

// PATCH /api/v1/environments/:id - Update environment (accepts UUID or name)
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
  const userId = locals.userId;
  const idOrName = params.id;

  try {
    const existingEnv = await environmentsService.findByIdOrName(userId, idOrName);

    if (!existingEnv) {
      return json({ error: 'Environment not found' }, { status: 404 });
    }

    const envId = existingEnv.id;
    const body = await request.json();
    const payload = EnvironmentUpdateInputSchema.parse({ ...body, id: envId });

    if (payload.name) {
      await environmentsService.update(userId, envId, payload);
    }

    if (payload.values && Array.isArray(payload.values)) {
      await environmentsService.updateValues(userId, envId, payload.values);
    }

    const updatedEnv = await environmentsService.findById(userId, envId);
    return jsonResponse(EnvironmentSchema, updatedEnv);
  } catch (error) {
    console.error('Failed to update environment:', error);
    return json(
      { error: 'Failed to update environment', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};

// DELETE /api/v1/environments/:id - Delete environment (accepts UUID or name)
export const DELETE: RequestHandler = async ({ locals, params }) => {
  const userId = locals.userId;
  const idOrName = params.id;

  try {
    const env = await environmentsService.findByIdOrName(userId, idOrName);

    if (!env) {
      return json({ error: 'Environment not found' }, { status: 404 });
    }

    const deleted = await environmentsService.delete(userId, env.id);

    if (deleted === 0) {
      return json({ error: 'Environment not found' }, { status: 404 });
    }

    return json({ deleted });
  } catch (error) {
    console.error('Failed to delete environment:', error);
    return json({ error: 'Failed to delete environment' }, { status: 500 });
  }
};
