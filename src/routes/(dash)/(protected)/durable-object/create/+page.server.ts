import { workersService } from '#lib/services/workers.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  return {
    workers: await workersService.findAll(locals.userId)
  };
};
