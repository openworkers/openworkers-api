import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { planetScaleService } from '$lib/services/planetscale';

export const POST: RequestHandler = async ({ locals, request }) => {
  const userId = locals.userId;
  const body = (await request.json()) as { code?: string };

  if (!body.code) {
    return json({ error: 'Missing code parameter' }, { status: 400 });
  }

  try {
    await planetScaleService.exchangeCode(userId, body.code);
    return json({ success: true });
  } catch (error) {
    console.error('PlanetScale code exchange failed:', error);
    return json(
      { error: 'Failed to exchange code', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
