import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { github as githubConfig } from '$lib/config';

export const POST: RequestHandler = async () => {
  if (!githubConfig.clientId) {
    return json({ error: 'GitHub OAuth not configured' }, { status: 500 });
  }

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', githubConfig.clientId);

  return redirect(302, githubAuthUrl.toString());
};
