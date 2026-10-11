import { planetScaleService } from '#lib/services/planetscale.ts';
import { getToken } from '#lib/services/db/planetscale-tokens.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!(await getToken(locals.userId))) {
    return { orgs: null, note: null };
  }

  try {
    return { orgs: await planetScaleService.listOrganizations(locals.userId), note: null };
  } catch (error) {
    console.error('Failed to list PlanetScale organizations:', error);
    return { orgs: null, note: 'Failed to list organizations' };
  }
};
