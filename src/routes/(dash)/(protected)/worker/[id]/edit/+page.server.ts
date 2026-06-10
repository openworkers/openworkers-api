import { error } from '@sveltejs/kit';
import { workersService } from '$lib/services/workers';
import { environmentsService } from '$lib/services/environments';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const worker = await workersService.findById(locals.userId, params.id, { includeScript: true });

  if (!worker) {
    throw error(404, 'Not found');
  }

  // The worker's environment feeds the editor's `declare var env` IntelliSense
  // lib. Only key + binding type are sent to the page — secret VALUES never
  // leave the server here.
  const environment = worker.environment
    ? await environmentsService.findById(locals.userId, worker.environment.id)
    : null;

  const envValues = (environment?.values ?? []).map((v) => ({ key: v.key, type: v.type }));

  return { worker, envValues };
};
