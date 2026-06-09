import { error } from '@sveltejs/kit';
import { environmentsService } from '$lib/services/environments';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const item = await environmentsService.findById(locals.userId, params.id);

  if (!item) {
    throw error(404, 'Not found');
  }

  return { item };
};
