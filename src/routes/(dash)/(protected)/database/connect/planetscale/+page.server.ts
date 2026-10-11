import { redirect } from '@sveltejs/kit';
import { planetScaleService } from '#lib/services/planetscale.ts';
import { getToken } from '#lib/services/db/planetscale-tokens.ts';
import { checkPlanetScaleState } from '#lib/server/planetscale-oauth.ts';
import type { PageServerLoad } from './$types';

const notConnected = (note: string | null) => ({
  connected: false,
  note,
  org: null,
  database: null,
  branch: null,
  items: [] as { id: string; name: string }[]
});

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
  const code = url.searchParams.get('code');

  // Back from PlanetScale (through /api/v1/callback/planetscale)
  if (code) {
    if (!checkPlanetScaleState(cookies, url.searchParams.get('state'))) {
      return notConnected('This PlanetScale answer was not asked for by this browser. Connect again.');
    }

    try {
      await planetScaleService.exchangeCode(locals.userId, code);
    } catch (error) {
      console.error('PlanetScale code exchange failed:', error);
      return notConnected('Failed to connect the PlanetScale account');
    }

    redirect(303, url.pathname);
  }

  const org = url.searchParams.get('org');
  const database = url.searchParams.get('database');
  const branch = url.searchParams.get('branch');
  const selection = { org, database, branch };

  if (!(await getToken(locals.userId))) {
    return notConnected(null);
  }

  // Each step is a link that adds one parameter, so the page works without JS and the back button goes one step back
  try {
    const items = !org
      ? await planetScaleService.listOrganizations(locals.userId)
      : !database
        ? await planetScaleService.listDatabases(locals.userId, org)
        : !branch
          ? await planetScaleService.listBranches(locals.userId, org, database)
          : [];

    return { connected: true, note: null, ...selection, items: items.map(({ id, name }) => ({ id, name })) };
  } catch (error) {
    console.error('Failed to read PlanetScale:', error);
    return { connected: true, note: 'PlanetScale did not answer. Try again.', ...selection, items: [] };
  }
};
