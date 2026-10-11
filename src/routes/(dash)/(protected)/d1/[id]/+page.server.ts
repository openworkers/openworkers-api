import { error } from '@sveltejs/kit';
import { d1Service } from '#lib/services/d1.ts';
import { environmentsService } from '#lib/services/environments.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const item = await d1Service.findById(locals.userId, params.id);

  if (!item) {
    throw error(404, 'Not found');
  }

  return { item, usages: await environmentsService.findBindingUsages(locals.userId, item.id) };
};
