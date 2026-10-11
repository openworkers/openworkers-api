import type { RequestHandler } from './$types';
import { CONNECT_PATH } from '#lib/server/planetscale-oauth.ts';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const GET: RequestHandler = async ({ url }) => {
  const code = url.searchParams.get('code');

  if (!code) {
    return Response.json({ error: 'Missing code parameter' }, { status: 400 });
  }

  const target = escapeHtml(
    `${CONNECT_PATH}?${new URLSearchParams({ code, state: url.searchParams.get('state') ?? '' })}`
  );

  // The session cookies are SameSite=strict: a redirect from PlanetScale arrives without them, while a navigation
  // that this page starts carries them
  return new Response(
    `<!doctype html><meta http-equiv="refresh" content="0;url=${target}"><a href="${target}">Continue</a>`,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer'
      }
    }
  );
};
