import type { Cookies } from '@sveltejs/kit';
import { getJwtConfig } from '$lib/config';
import { parseExpiration } from '$lib/services/auth';

type Tokens = { accessToken: string; refreshToken: string };

// BFF session: both tokens live in HttpOnly cookies, never exposed to JS. The
// cookie lifetimes mirror the JWT TTLs so the refresh cookie outlives access.
// `secure` is omitted on purpose — SvelteKit sets it on https and relaxes it on
// http://localhost for local dev.
const baseOptions = { httpOnly: true, sameSite: 'strict' as const, path: '/' };

export function setSession(cookies: Cookies, tokens: Tokens): void {
  const cfg = getJwtConfig();

  cookies.set('access_token', tokens.accessToken, {
    ...baseOptions,
    maxAge: parseExpiration(cfg.access.expiresIn)
  });

  cookies.set('refresh_token', tokens.refreshToken, {
    ...baseOptions,
    maxAge: parseExpiration(cfg.refresh.expiresIn)
  });
}

export function clearSession(cookies: Cookies): void {
  cookies.delete('access_token', { path: '/' });
  cookies.delete('refresh_token', { path: '/' });
}
