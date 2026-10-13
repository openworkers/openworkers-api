import { error } from '@sveltejs/kit';
import { durableObjectsService } from '#lib/services/durable-objects.ts';
import { environmentsService } from '#lib/services/environments.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const item = await durableObjectsService.findById(locals.userId, params.id);

  if (!item) {
    throw error(404, 'Not found');
  }

  return { item, usages: await environmentsService.findBindingUsages(locals.userId, item.id) };
};
