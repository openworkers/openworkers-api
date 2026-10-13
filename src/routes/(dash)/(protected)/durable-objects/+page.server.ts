import { durableObjectsService } from '#lib/services/durable-objects.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  return {
    items: await durableObjectsService.findAll(locals.userId)
  };
};
