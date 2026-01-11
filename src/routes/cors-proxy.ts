import { Hono } from 'hono';

/**
 * Simple CORS proxy for Anthropic API
 *
 * This is a transparent passthrough proxy that:
 * - Does NOT store or cache any tokens
 * - Does NOT modify requests (except removing origin headers)
 * - Simply forwards requests to api.anthropic.com
 *
 * This is needed because the Anthropic API doesn't have CORS headers
 * for browser-based requests (WebContainers).
 */

const ALLOWED_HOSTS = ['api.anthropic.com', 'console.anthropic.com'];

// Allowed origins for CORS (dashboard domains + WebContainers)
const ALLOWED_ORIGINS = [
  'https://dash.openworkers.dev',
  'https://dash.openworkers.com',
  'https://dash.dev.localhost',
  // WebContainers uses dynamic subdomains
  /^https:\/\/.*\.webcontainer-api\.io$/,
  /^https:\/\/.*\.staticblitz\.com$/,
  /^https:\/\/.*\.w-credentialless-staticblitz\.com$/
];

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  return ALLOWED_ORIGINS.some((allowed) => {
    if (typeof allowed === 'string') {
      return origin === allowed;
    }

    return allowed.test(origin);
  });
}

function getCorsOrigin(origin: string | null): string {
  if (origin && isOriginAllowed(origin)) {
    return origin;
  }

  return 'https://dash.openworkers.dev'; // default fallback
}

const corsProxy = new Hono();

// Proxy all requests to Anthropic
corsProxy.all('/*', async (c) => {
  // Strip /api/cors-proxy from the path (Hono gives us the full path)
  const targetPath = c.req.path.replace(/^\/api\/cors-proxy/, '');
  const url = new URL(c.req.url);
  const targetHost = url.searchParams.get('host') || 'api.anthropic.com';

  console.log(`[cors-proxy] ${c.req.method} ${targetPath} -> ${targetHost}`);

  // Validate target host
  if (!ALLOWED_HOSTS.includes(targetHost)) {
    return c.json({ error: 'Host not allowed' }, 403);
  }

  const targetUrl = `https://${targetHost}${targetPath}`;

  // Get original headers, remove browser-specific ones
  const headers = new Headers();

  for (const [key, value] of c.req.raw.headers.entries()) {
    const lowerKey = key.toLowerCase();

    // Skip headers that would break the proxy
    if (
      lowerKey === 'host' ||
      lowerKey === 'origin' ||
      lowerKey === 'referer' ||
      lowerKey === 'connection' ||
      lowerKey === 'content-length'
    ) {
      continue;
    }

    headers.set(key, value);
  }

  try {
    // Forward the request
    const response = await fetch(targetUrl, {
      method: c.req.method,
      headers,
      body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? await c.req.raw.clone().arrayBuffer() : undefined
    });

    // Build response with CORS headers
    const origin = c.req.header('Origin') || null;
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', getCorsOrigin(origin));
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    responseHeaders.set('Access-Control-Expose-Headers', '*');
    // Private Network Access (PNA)
    responseHeaders.set('Access-Control-Allow-Private-Network', 'true');

    // Handle streaming responses
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      responseHeaders.set('Content-Type', 'text/event-stream');
      responseHeaders.set('Cache-Control', 'no-cache');
      responseHeaders.set('Connection', 'keep-alive');
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    console.error('[cors-proxy] Error:', error);
    return c.json({ error: 'Proxy request failed' }, 502);
  }
});

// Handle CORS preflight (including Private Network Access)
corsProxy.options('/*', (c) => {
  const origin = c.req.header('Origin') || null;

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': getCorsOrigin(origin),
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
      // Private Network Access (PNA) - allows requests from public to private networks
      'Access-Control-Allow-Private-Network': 'true'
    }
  });
});

export default corsProxy;
