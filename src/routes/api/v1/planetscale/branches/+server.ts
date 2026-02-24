import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { planetScaleService } from '$lib/services/planetscale';

export const GET: RequestHandler = async ({ locals, url }) => {
  const userId = locals.userId;
  const org = url.searchParams.get('org');
  const db = url.searchParams.get('db');

  if (!org || !db) {
    return json({ error: 'Missing org or db parameter' }, { status: 400 });
  }

  try {
    const branches = await planetScaleService.listBranches(userId, org, db);
    return json(branches);
  } catch (error) {
    console.error('Failed to list PlanetScale branches:', error);
    return json(
      { error: 'Failed to list branches', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
