import type { Cookies } from '@sveltejs/kit';
import { getPlanetScaleConfig } from '#lib/config/index.ts';

export const CONNECT_PATH = '/database/connect/planetscale';

const STATE_COOKIE = 'planetscale_oauth_state';

// The state cookie ties the answer of PlanetScale to the browser that asked for it
export function startPlanetScaleOAuth(cookies: Cookies): string | null {
  const config = getPlanetScaleConfig();

  if (!config.clientId) {
    return null;
  }

  const state = crypto.randomUUID();
  cookies.set(STATE_COOKIE, state, { path: CONNECT_PATH, httpOnly: true, sameSite: 'lax', maxAge: 600 });

  const url = new URL('https://app.planetscale.com/oauth/authorize');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', `${config.appUrl}/api/v1/callback/planetscale`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);

  return url.toString();
}

// Usable once: the cookie goes whatever the result
export function checkPlanetScaleState(cookies: Cookies, state: string | null): boolean {
  const expected = cookies.get(STATE_COOKIE);
  cookies.delete(STATE_COOKIE, { path: CONNECT_PATH });

  return Boolean(expected && state && expected === state);
}
