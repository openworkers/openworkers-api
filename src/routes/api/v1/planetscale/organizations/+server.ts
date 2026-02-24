import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { planetScaleService } from '$lib/services/planetscale';

export const GET: RequestHandler = async ({ locals }) => {
  const userId = locals.userId;

  try {
    const organizations = await planetScaleService.listOrganizations(userId);
    return json(organizations);
  } catch (error) {
    console.error('Failed to list PlanetScale organizations:', error);
    return json(
      { error: 'Failed to list organizations', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
