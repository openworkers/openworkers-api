import { error } from '@sveltejs/kit';
import { workersService } from '$lib/services/workers';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const worker = await workersService.findById(locals.userId, params.id);

  if (!worker) {
    throw error(404, 'Not found');
  }

  return { worker };
};
