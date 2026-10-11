import { kvService } from '#lib/services/kv.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  return {
    items: await kvService.findAll(locals.userId)
  };
};
