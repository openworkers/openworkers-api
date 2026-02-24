import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPlanetScaleConfig } from '$lib/config';

export const GET: RequestHandler = async ({ url }) => {
  const code = url.searchParams.get('code');

  if (!code) {
    return json({ error: 'Missing code parameter' }, { status: 400 });
  }

  const config = getPlanetScaleConfig();
  const dashboardUrl = `${config.appUrl}/database/connect/planetscale?code=${encodeURIComponent(code)}`;

  return redirect(302, dashboardUrl);
};
