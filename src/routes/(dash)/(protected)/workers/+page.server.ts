import { workersService } from '$lib/services/workers';
import type { PageServerLoad } from './$types';

// SSR loader: call the SAME service the REST endpoint uses, straight to the DB —
// no /api round-trip. locals.userId is guaranteed by the (protected) guard.
export const load: PageServerLoad = async ({ locals }) => {
  return {
    workers: await workersService.findAll(locals.userId)
  };
};
