import { redirect } from '@sveltejs/kit';
import { planetScaleService } from '#lib/services/planetscale.ts';
import { getToken } from '#lib/services/db/planetscale-tokens.ts';
import { checkPlanetScaleState } from '#lib/server/planetscale-oauth.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
  const code = url.searchParams.get('code');

  // Back from PlanetScale (through /api/v1/callback/planetscale)
  if (code) {
    if (!checkPlanetScaleState(cookies, url.searchParams.get('state'))) {
      return { orgs: null, note: 'This PlanetScale answer was not asked for by this browser. Connect again.' };
    }

    try {
      await planetScaleService.exchangeCode(locals.userId, code);
    } catch (error) {
      console.error('PlanetScale code exchange failed:', error);
      return { orgs: null, note: 'Failed to connect the PlanetScale account' };
    }

    redirect(303, url.pathname);
  }

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
