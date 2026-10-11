import { error } from '@sveltejs/kit';
import { workersService } from '#lib/services/workers.ts';
import { environmentsService } from '#lib/services/environments.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const worker = await workersService.findById(locals.userId, params.id);

  if (!worker) {
    throw error(404, 'Not found');
  }

  const environments = await environmentsService.findAll(locals.userId);

  return { worker, environments };
};
