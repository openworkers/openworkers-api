import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cronsService } from '$lib/services/crons';
import { workersService } from '$lib/services/workers';
import { CronUpdateInputSchema, WorkerSchema } from '$lib/types';
import { jsonResponse, parseAndValidate } from '$lib/server/validate';

// PATCH /api/v1/crons/:id - Update cron
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
  const userId = locals.userId;
  const id = params.id;
  const payload = await parseAndValidate(request, CronUpdateInputSchema);

  try {
    const cron = await cronsService.update(userId, id, payload);

    const updatedWorker = await workersService.findById(userId, cron.workerId);
    return jsonResponse(WorkerSchema, updatedWorker);
  } catch (error) {
    console.error('Failed to update cron:', error);
    return json(
      { error: 'Failed to update cron', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};

// DELETE /api/v1/crons/:id - Delete cron
export const DELETE: RequestHandler = async ({ locals, params }) => {
  const userId = locals.userId;
  const id = params.id;

  try {
    const cron = await cronsService.findById(userId, id);
    if (!cron) {
      return json({ error: 'Cron not found' }, { status: 404 });
    }

    const deleted = await cronsService.delete(userId, id);

    if (deleted === 0) {
      return json({ error: 'Cron not found' }, { status: 404 });
    }

    const updatedWorker = await workersService.findById(userId, cron.workerId);
    return json(updatedWorker);
  } catch (error) {
    console.error('Failed to delete cron:', error);
    return json({ error: 'Failed to delete cron' }, { status: 500 });
  }
};
