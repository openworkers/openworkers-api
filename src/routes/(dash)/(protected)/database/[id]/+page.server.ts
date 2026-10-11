import { error } from '@sveltejs/kit';
import { databasesService } from '#lib/services/databases.ts';
import { environmentsService } from '#lib/services/environments.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const item = await databasesService.findById(locals.userId, params.id);

  if (!item) {
    throw error(404, 'Not found');
  }

  const usages = await environmentsService.findBindingUsages(locals.userId, item.id);

  return { item, usages };
};
