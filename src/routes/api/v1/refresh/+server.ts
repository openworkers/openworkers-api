import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verify } from '$lib/utils/jwt';
import { authService } from '$lib/services/auth';
import { getJwtConfig } from '$lib/config';
import { LoginResponseSchema } from '$lib/types';
import { jsonResponse } from '$lib/server/validate';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const refreshToken = body.refreshToken;

  if (!refreshToken) {
    return json({ error: 'Missing refresh token' }, { status: 400 });
  }

  try {
    const payload = await verify(refreshToken, getJwtConfig().refresh.secret);

    if (!payload.sub || typeof payload.sub !== 'string') {
      return json({ error: 'Invalid token payload' }, { status: 401 });
    }

    const tokens = await authService.refreshTokens(payload.sub);

    const response = jsonResponse(LoginResponseSchema, tokens);
    response.headers.append(
      'Set-Cookie',
      `access_token=${tokens.accessToken}; HttpOnly; Secure; SameSite=Strict; Path=/`
    );
    return response;
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    return json({ error: 'Invalid or expired refresh token' }, { status: 401 });
  }
};
