import { databasesService } from '$lib/services/databases';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  return {
    items: await databasesService.findAll(locals.userId)
  };
};
