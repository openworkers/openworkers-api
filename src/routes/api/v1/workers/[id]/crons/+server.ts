import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { workersService } from '$lib/services/workers';
import { cronsService } from '$lib/services/crons';
import { WorkerSchema } from '$lib/types';
import { jsonResponse } from '$lib/server/validate';

// POST /api/v1/workers/:id/crons - Create cron for worker
export const POST: RequestHandler = async ({ locals, params, request }) => {
  const userId = locals.userId;
  const idOrName = params.id;
  const body = await request.json();

  if (!body.expression) {
    return json({ error: 'Missing required field: expression' }, { status: 400 });
  }

  try {
    const worker = await workersService.findByIdOrName(userId, idOrName);

    if (!worker) {
      return json({ error: 'Worker not found' }, { status: 404 });
    }

    await cronsService.create(userId, {
      workerId: worker.id,
      value: body.expression
    });

    const updatedWorker = await workersService.findById(userId, worker.id, {});
    return jsonResponse(WorkerSchema, updatedWorker, 201);
  } catch (error) {
    console.error('Failed to create cron:', error);
    return json(
      { error: 'Failed to create cron', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
