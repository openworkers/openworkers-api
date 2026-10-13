import { error } from '@sveltejs/kit';
import { environmentsService } from '#lib/services/environments.ts';
import { storageService } from '#lib/services/storage.ts';
import { kvService } from '#lib/services/kv.ts';
import { databasesService } from '#lib/services/databases.ts';
import { workersService } from '#lib/services/workers.ts';
import { d1Service } from '#lib/services/d1.ts';
import { durableObjectsService } from '#lib/services/durable-objects.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const item = await environmentsService.findById(locals.userId, params.id);

  if (!item) {
    throw error(404, 'Not found');
  }

  // Sibling resources, for resolving binding names and populating the pickers.
  const [storage, kv, databases, workers, d1, durableObjects] = await Promise.all([
    storageService.findAll(locals.userId),
    kvService.findAll(locals.userId),
    databasesService.findAll(locals.userId),
    workersService.findAll(locals.userId),
    d1Service.findAll(locals.userId),
    durableObjectsService.findAll(locals.userId)
  ]);

  return { item, storage, kv, databases, workers, d1, durableObjects };
};
