// @deprecated — kept for the legacy Angular dashboard. The new UI BFFs this
// flow as a SvelteKit form action/load; tokens are set as HttpOnly cookies
// server-side (see src/routes/(dash)/sign-in/**).
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/services/auth';
import { getGithubConfig } from '$lib/config';
import { LoginResponseSchema } from '$lib/types';
import { jsonResponse } from '$lib/server/validate';

function setAccessTokenCookie(response: Response, token: string): Response {
  response.headers.append('Set-Cookie', `access_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/`);
  return response;
}

export const GET: RequestHandler = async ({ url }) => {
  const code = url.searchParams.get('code');

  if (!code) {
    return json({ error: 'Missing code parameter' }, { status: 400 });
  }

  const githubConfig = getGithubConfig();

  if (!githubConfig.clientId || !githubConfig.clientSecret) {
    return json({ error: 'GitHub OAuth not configured' }, { status: 500 });
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        client_id: githubConfig.clientId,
        client_secret: githubConfig.clientSecret,
        code
      })
    });

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      error?: string;
    };

    if (!tokenData.access_token) {
      return json({ error: 'Failed to get GitHub access token', details: tokenData.error }, { status: 401 });
    }

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json'
      }
    });

    const contentType = userResponse.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return json(
        { error: 'Unexpected response from GitHub user API', details: await userResponse.text() },
        { status: 500 }
      );
    }

    const githubUser = (await userResponse.json()) as {
      id: number;
      login: string;
      avatar_url: string;
    };

    const user = await authService.findOrCreateGitHubUser(githubUser);
    const tokens = await authService.createTokens(user);

    const response = jsonResponse(LoginResponseSchema, tokens);
    return setAccessTokenCookie(response, tokens.accessToken);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return json(
      { error: 'Authentication failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
