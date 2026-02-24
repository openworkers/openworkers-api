import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPlanetScaleConfig } from '$lib/config';

export const POST: RequestHandler = async () => {
  const config = getPlanetScaleConfig();

  if (!config.clientId) {
    return json({ error: 'PlanetScale OAuth not configured' }, { status: 500 });
  }

  const authUrl = new URL('https://app.planetscale.com/oauth/authorize');
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', `${config.appUrl}/api/v1/callback/planetscale`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', crypto.randomUUID());

  return redirect(302, authUrl.toString());
};
