import { json, type Handle } from '@sveltejs/kit';
import { authenticate } from '$lib/server/auth';
import { setSession } from '$lib/server/auth-cookies';
import { authService } from '$lib/services/auth';
import { getJwtConfig } from '$lib/config';
import { verify } from '$lib/utils/jwt';

/** Route prefixes that don't require authentication */
const PUBLIC_PREFIXES = ['/api/health', '/api/domain/'];

/** Routes that don't require authentication */
const PUBLIC_ROUTES = new Set([
  '/api/v1/version',
  '/api/v1/openid/github',
  '/api/v1/callback/github',
  '/api/v1/register',
  '/api/v1/set-password',
  '/api/v1/login',
  '/api/v1/forgot-password',
  '/api/v1/reset-password',
  '/api/v1/resend-set-password',
  '/api/v1/refresh',
  '/api/v1/callback/planetscale'
]);

export const handle: Handle = async ({ event, resolve }) => {
  const path = event.url.pathname;
  const method = event.request.method;
  const requestId = event.request.headers.get('x-request-id') || crypto.randomUUID().slice(0, 8);
  const start = performance.now();

  console.log(`<-- ${method} ${requestId} ${path}`);

  // Public routes: no auth required
  if (PUBLIC_ROUTES.has(path) || PUBLIC_PREFIXES.some((p) => path.startsWith(p))) {
    const response = await resolve(event);
    const ms = (performance.now() - start).toFixed(0);
    console.log(`--> ${method} ${requestId} ${path} ${response.status} ${ms}ms`);
    return response;
  }

  // Authenticate every request (pages included) so SSR loads can read
  // locals.userId. Only /api enforces a 401 here; page routes handle their own
  // redirects via layout guards.
  let auth = await authenticate(event.request);

  // Transparent refresh (BFF): the access token is invalid/expired but a valid
  // refresh cookie is present → mint a fresh session server-side and set new
  // HttpOnly cookies. The browser never handles a token.
  if (!auth) {
    const refreshToken = event.cookies.get('refresh_token');

    if (refreshToken) {
      try {
        const payload = await verify(refreshToken, getJwtConfig().refresh.secret);

        if (typeof payload.sub === 'string') {
          const tokens = await authService.refreshTokens(payload.sub);
          setSession(event.cookies, tokens);
          auth = { userId: payload.sub, authMethod: 'jwt' };
        }
      } catch {
        // Invalid/expired refresh token — stay unauthenticated.
      }
    }
  }

  if (auth) {
    event.locals.userId = auth.userId;
    event.locals.authMethod = auth.authMethod;
  }

  if (path.startsWith('/api/') && !auth) {
    const ms = (performance.now() - start).toFixed(0);
    console.log(`--> ${method} ${requestId} ${path} 401 ${ms}ms`);
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = await resolve(event);
  const ms = (performance.now() - start).toFixed(0);
  console.log(`--> ${method} ${requestId} ${path} ${response.status} ${ms}ms`);
  return response;
};
