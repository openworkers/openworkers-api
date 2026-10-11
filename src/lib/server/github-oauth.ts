import type { Cookies } from '@sveltejs/kit';
import { getGithubConfig } from '#lib/config/index.ts';
import { checkOAuthState, createOAuthState } from './oauth-state.ts';

const CALLBACK_PATH = '/sign-in/callback/github';
const STATE_COOKIE = 'github_oauth_state';

export function startGithubOAuth(cookies: Cookies): string | null {
  const github = getGithubConfig();

  if (!github.clientId) {
    return null;
  }

  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', github.clientId);
  url.searchParams.set('state', createOAuthState(cookies, STATE_COOKIE, CALLBACK_PATH));

  return url.toString();
}

export function checkGithubState(cookies: Cookies, state: string | null): boolean {
  return checkOAuthState(cookies, STATE_COOKIE, CALLBACK_PATH, state);
}
