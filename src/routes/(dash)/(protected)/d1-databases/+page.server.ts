import { d1Service } from '#lib/services/d1.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  return {
    items: await d1Service.findAll(locals.userId)
  };
};
