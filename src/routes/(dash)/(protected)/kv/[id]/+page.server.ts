import { error } from '@sveltejs/kit';
import { kvService } from '#lib/services/kv.ts';
import { environmentsService } from '#lib/services/environments.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const item = await kvService.findById(locals.userId, params.id);

  if (!item) {
    throw error(404, 'Not found');
  }

  const usages = await environmentsService.findBindingUsages(locals.userId, item.id);

  return { item, usages };
};
