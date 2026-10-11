import type { Cookies } from '@sveltejs/kit';

// The state ties the answer of the provider to the browser that asked for it. Lax, because the provider sends the
// browser back with a top-level navigation from its own site.
export function createOAuthState(cookies: Cookies, name: string, path: string): string {
  const state = crypto.randomUUID();
  cookies.set(name, state, { path, httpOnly: true, sameSite: 'lax', maxAge: 600 });

  return state;
}

// Usable once: the cookie goes whatever the result
export function checkOAuthState(cookies: Cookies, name: string, path: string, state: string | null): boolean {
  const expected = cookies.get(name);
  cookies.delete(name, { path });

  return Boolean(expected && state && expected === state);
}
