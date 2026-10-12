import { authService } from '#lib/services/auth.ts';
import { setSession } from '#lib/server/auth-cookies.ts';
import { checkGithubState } from '#lib/server/github-oauth.ts';
import type { PageServerLoad } from './$types';

// BFF: GitHub redirects here with ?code=; exchange it server-side and mint a
// session into HttpOnly cookies. The browser never handles a token.
export const load: PageServerLoad = async ({ url, cookies }) => {
  const code = url.searchParams.get('code');

  if (!code) {
    return { error: 'Missing authorization code.' };
  }

  if (!checkGithubState(cookies, url.searchParams.get('state'))) {
    return { error: 'This GitHub answer was not asked for by this browser. Sign in again.' };
  }

  let user;
  try {
    user = await authService.loginWithGithub(code);
  } catch {
    return { error: 'GitHub sign-in failed.' };
  }

  setSession(cookies, await authService.createTokens(user));

  // The session cookies are SameSite=strict. After the GitHub consent screen, this request is a navigation that
  // GitHub started, and a redirect would continue it without the new cookies: the page navigates itself instead.
  return { next: '/workers' };
};
