import type { RequestHandler } from './$types';
import { cronsService } from '#lib/services/crons.ts';
import { workersService } from '#lib/services/workers.ts';
import { CronUpdateInputSchema, WorkerSchema } from '#lib/types/index.ts';
import { jsonResponse, parseAndValidate, serviceErrorResponse } from '#lib/server/validate.ts';
import { ServiceError } from '#lib/services/errors.ts';

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
    if (error instanceof ServiceError) {
      return serviceErrorResponse(error, 'Failed to update cron');
    }

    console.error('Failed to update cron:', error);
    return Response.json(
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
      return Response.json({ error: 'Cron not found' }, { status: 404 });
    }

    const deleted = await cronsService.delete(userId, id);

    if (deleted === 0) {
      return Response.json({ error: 'Cron not found' }, { status: 404 });
    }

    const updatedWorker = await workersService.findById(userId, cron.workerId);
    return Response.json(updatedWorker);
  } catch (error) {
    console.error('Failed to delete cron:', error);
    return Response.json({ error: 'Failed to delete cron' }, { status: 500 });
  }
};
