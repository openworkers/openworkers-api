import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { startPlanetScaleOAuth } from '#lib/server/planetscale-oauth.ts';

export const POST: RequestHandler = async ({ cookies }) => {
  const authUrl = startPlanetScaleOAuth(cookies);

  if (!authUrl) {
    return Response.json({ error: 'PlanetScale OAuth not configured' }, { status: 500 });
  }

  return redirect(302, authUrl, { external: true });
};
