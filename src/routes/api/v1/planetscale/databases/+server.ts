import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { planetScaleService } from '$lib/services/planetscale';

export const GET: RequestHandler = async ({ locals, url }) => {
  const userId = locals.userId;
  const org = url.searchParams.get('org');

  if (!org) {
    return json({ error: 'Missing org parameter' }, { status: 400 });
  }

  try {
    const databases = await planetScaleService.listDatabases(userId, org);
    return json(databases);
  } catch (error) {
    console.error('Failed to list PlanetScale databases:', error);
    return json(
      { error: 'Failed to list databases', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
