import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { workersService } from '$lib/services/workers';
import * as projectsDb from '$lib/services/db/projects';
import { WorkerUpdateInputSchema, WorkerSchema } from '$lib/types';
import { jsonResponse, parseAndValidate } from '$lib/server/validate';

// GET /api/v1/workers/:id - Get single worker (accepts UUID or name)
export const GET: RequestHandler = async ({ locals, params, url }) => {
  const userId = locals.userId;
  const idOrName = params.id;
  const includeScript = url.searchParams.get('script') === 'true';

  try {
    const worker = await workersService.findByIdOrName(userId, idOrName, { includeScript });

    if (!worker) {
      return json({ error: 'Worker not found' }, { status: 404 });
    }

    return jsonResponse(WorkerSchema, worker);
  } catch (error) {
    console.error('Failed to fetch worker:', error);
    return json({ error: 'Failed to fetch worker' }, { status: 500 });
  }
};

// PATCH /api/v1/workers/:id - Update worker (accepts UUID or name)
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
  const userId = locals.userId;
  const idOrName = params.id;
  const payload = await parseAndValidate(request, WorkerUpdateInputSchema);

  try {
    const worker = await workersService.findByIdOrName(userId, idOrName);

    if (!worker) {
      return json({ error: 'Worker not found' }, { status: 404 });
    }

    const updatedWorker = await workersService.update(userId, worker.id, payload);

    if (!updatedWorker) {
      return json({ error: 'Worker not found' }, { status: 404 });
    }

    return jsonResponse(WorkerSchema, updatedWorker);
  } catch (error) {
    console.error('Failed to update worker:', error);
    return json(
      { error: 'Failed to update worker', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};

// DELETE /api/v1/workers/:id - Delete worker (accepts UUID or name)
export const DELETE: RequestHandler = async ({ locals, params }) => {
  const userId = locals.userId;
  const idOrName = params.id;

  try {
    const worker = await workersService.findByIdOrName(userId, idOrName);

    if (!worker) {
      return json({ error: 'Worker not found' }, { status: 404 });
    }

    const isProject = await projectsDb.isProjectMainWorker(userId, worker.id);

    let deleted: number;

    if (isProject) {
      deleted = await projectsDb.deleteProject(userId, worker.id);
    } else {
      deleted = await workersService.delete(userId, worker.id);
    }

    if (deleted === 0) {
      return json({ error: 'Worker not found' }, { status: 404 });
    }

    return json({ deleted });
  } catch (error) {
    console.error('Failed to delete worker:', error);
    return json({ error: 'Failed to delete worker' }, { status: 500 });
  }
};
