import { fail, redirect } from '@sveltejs/kit';
import { getGithubConfig } from '$lib/config';
import { authService } from '$lib/services/auth';
import { setSession } from '$lib/server/auth-cookies';
import type { Actions, PageServerLoad } from './$types';

// Already signed in? Skip the login page.
export const load: PageServerLoad = ({ locals }) => {
  if (locals.userId) {
    throw redirect(307, '/workers');
  }
};

// Token flows are BFF'd here as form actions — they mint tokens server-side and
// store them in HttpOnly cookies. The /api/v1/login & /register endpoints are
// kept only for the legacy Angular dash.
export const actions: Actions = {
  login: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = String(data.get('email') ?? '');
    const password = String(data.get('password') ?? '');

    try {
      const user = await authService.loginWithPassword(email, password);
      setSession(cookies, await authService.createTokens(user));
    } catch {
      return fail(401, { mode: 'login', email, error: 'Invalid email or password' });
    }

    throw redirect(303, '/workers');
  },

  register: async ({ request }) => {
    const data = await request.formData();
    const email = String(data.get('email') ?? '');

    try {
      await authService.registerWithEmail(email);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Registration failed';
      return fail(400, { mode: 'register', email, error: message });
    }

    return { mode: 'register', success: 'Check your email to set your password.' };
  },

  // Browser-only OAuth kickoff — also a co-located action, not a /api/v1 route.
  github: () => {
    const github = getGithubConfig();

    if (!github.clientId) {
      throw redirect(303, '/sign-in?error=github-not-configured');
    }

    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', github.clientId);

    throw redirect(302, authUrl.toString());
  }
};
