import type { Cookies } from '@sveltejs/kit';
import { getPlanetScaleConfig } from '#lib/config/index.ts';
import { checkOAuthState, createOAuthState } from './oauth-state.ts';

export const CONNECT_PATH = '/database/connect/planetscale';

const STATE_COOKIE = 'planetscale_oauth_state';

export function startPlanetScaleOAuth(cookies: Cookies): string | null {
  const config = getPlanetScaleConfig();

  if (!config.clientId) {
    return null;
  }

  const url = new URL('https://app.planetscale.com/oauth/authorize');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', `${config.appUrl}/api/v1/callback/planetscale`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', createOAuthState(cookies, STATE_COOKIE, CONNECT_PATH));

  return url.toString();
}

export function checkPlanetScaleState(cookies: Cookies, state: string | null): boolean {
  return checkOAuthState(cookies, STATE_COOKIE, CONNECT_PATH, state);
}
