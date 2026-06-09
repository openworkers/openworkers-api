import { redirect } from '@sveltejs/kit';
import { getGithubConfig } from '$lib/config';
import type { Actions, PageServerLoad } from './$types';

// Already signed in? Skip the login page.
export const load: PageServerLoad = ({ locals }) => {
  if (locals.userId) {
    throw redirect(307, '/workers');
  }
};

// Browser-only OAuth kickoff — a co-located form action, NOT a /api/v1 endpoint
// (the start URL isn't registered with GitHub, so it's free to live here).
export const actions: Actions = {
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
