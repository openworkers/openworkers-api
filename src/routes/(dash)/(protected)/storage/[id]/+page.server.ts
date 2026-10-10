import { error } from '@sveltejs/kit';
import { storageService } from '$lib/services/storage';
import { environmentsService } from '$lib/services/environments';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const item = await storageService.findById(locals.userId, params.id);

  if (!item) {
    throw error(404, 'Not found');
  }

  const usages = await environmentsService.findBindingUsages(locals.userId, item.id);

  return { item, usages };
};
