import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { workersService } from '$lib/services/workers';
import { WorkerCreateInputSchema, WorkerSchema } from '$lib/types';
import { jsonResponse, jsonArrayResponse, parseAndValidate } from '$lib/server/validate';
import defaultWorkerJs from '../../../../../examples/default-worker-js.txt';
import defaultWorkerTs from '../../../../../examples/default-worker-ts.txt';

// GET /api/v1/workers - List all workers for current user
export const GET: RequestHandler = async ({ locals }) => {
  const userId = locals.userId;

  try {
    const workers = await workersService.findAll(userId);
    return jsonArrayResponse(WorkerSchema, workers);
  } catch (error) {
    console.error('Failed to fetch workers:', error);
    return json({ error: 'Failed to fetch workers' }, { status: 500 });
  }
};

// POST /api/v1/workers - Create new worker
export const POST: RequestHandler = async ({ locals, request }) => {
  const userId = locals.userId;
  const payload = await parseAndValidate(request, WorkerCreateInputSchema);

  try {
    const defaultScript = payload.language === 'typescript' ? defaultWorkerTs : defaultWorkerJs;
    const script = payload.script ?? defaultScript;

    const worker = await workersService.create(userId, {
      name: payload.name,
      script,
      language: payload.language
    });

    return jsonResponse(WorkerSchema, worker, 201);
  } catch (error) {
    console.error('Failed to create worker:', error);
    return json(
      { error: 'Failed to create worker', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
