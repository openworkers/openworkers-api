import { environmentsService } from '$lib/services/environments';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  return {
    items: await environmentsService.findAll(locals.userId)
  };
};
