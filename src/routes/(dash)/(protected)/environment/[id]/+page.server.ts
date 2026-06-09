import { error } from '@sveltejs/kit';
import { environmentsService } from '$lib/services/environments';
import { storageService } from '$lib/services/storage';
import { kvService } from '$lib/services/kv';
import { databasesService } from '$lib/services/databases';
import { workersService } from '$lib/services/workers';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const item = await environmentsService.findById(locals.userId, params.id);

  if (!item) {
    throw error(404, 'Not found');
  }

  // Sibling resources, for resolving binding names and populating the pickers.
  const [storage, kv, databases, workers] = await Promise.all([
    storageService.findAll(locals.userId),
    kvService.findAll(locals.userId),
    databasesService.findAll(locals.userId),
    workersService.findAll(locals.userId)
  ]);

  return { item, storage, kv, databases, workers };
};
