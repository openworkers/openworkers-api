import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { environmentsService } from '$lib/services/environments';
import { EnvironmentCreateInputSchema, EnvironmentSchema } from '$lib/types';
import { jsonResponse, jsonArrayResponse, parseAndValidate } from '$lib/server/validate';

// GET /api/v1/environments - List all environments
export const GET: RequestHandler = async ({ locals }) => {
  const userId = locals.userId;
  try {
    const envs = await environmentsService.findAll(userId);
    return jsonArrayResponse(EnvironmentSchema, envs);
  } catch (error) {
    console.error('Failed to fetch environments:', error);
    return json({ error: 'Failed to fetch environments' }, { status: 500 });
  }
};

// POST /api/v1/environments - Create environment
export const POST: RequestHandler = async ({ locals, request }) => {
  const userId = locals.userId;
  const payload = await parseAndValidate(request, EnvironmentCreateInputSchema);

  try {
    const env = await environmentsService.create(userId, payload);
    return jsonResponse(EnvironmentSchema, env, 201);
  } catch (error) {
    console.error('Failed to create environment:', error);
    return json({ error: 'Failed to create environment' }, { status: 500 });
  }
};
