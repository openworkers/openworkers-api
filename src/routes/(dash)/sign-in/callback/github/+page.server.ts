import { redirect } from '@sveltejs/kit';
import { authService } from '$lib/services/auth';
import { setSession } from '$lib/server/auth-cookies';
import type { PageServerLoad } from './$types';

// BFF: GitHub redirects here with ?code=; exchange it server-side and mint a
// session into HttpOnly cookies. The browser never handles a token.
export const load: PageServerLoad = async ({ url, cookies }) => {
  const code = url.searchParams.get('code');

  if (!code) {
    return { error: 'Missing authorization code.' };
  }

  let user;
  try {
    user = await authService.loginWithGithub(code);
  } catch {
    return { error: 'GitHub sign-in failed.' };
  }

  setSession(cookies, await authService.createTokens(user));
  throw redirect(303, '/workers');
};
