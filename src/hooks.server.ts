import { json, type Handle } from '@sveltejs/kit';
import { authenticate } from '$lib/server/auth';

/** Route prefixes that don't require authentication */
const PUBLIC_PREFIXES = ['/api/health'];

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

  // Protected routes: require auth
  if (path.startsWith('/api/')) {
    const auth = await authenticate(event.request);

    if (!auth) {
      const ms = (performance.now() - start).toFixed(0);
      console.log(`--> ${method} ${requestId} ${path} 401 ${ms}ms`);
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    event.locals.userId = auth.userId;
    event.locals.authMethod = auth.authMethod;
  }

  const response = await resolve(event);
  const ms = (performance.now() - start).toFixed(0);
  console.log(`--> ${method} ${requestId} ${path} ${response.status} ${ms}ms`);
  return response;
};
