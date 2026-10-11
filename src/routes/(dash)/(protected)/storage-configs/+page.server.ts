import { storageService } from '#lib/services/storage.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  return {
    items: await storageService.findAll(locals.userId)
  };
};
