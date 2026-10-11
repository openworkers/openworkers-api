import { listApiKeys } from '#lib/services/db/api-keys.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const keys = await listApiKeys(locals.userId);

  return {
    keys: keys.map(({ id, name, tokenPrefix }) => ({ id, name, tokenPrefix }))
  };
};
