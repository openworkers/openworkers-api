import { redirect } from '@sveltejs/kit';
import { clearSession } from '$lib/server/auth-cookies';
import type { Actions } from './$types';

// UI-internal session op — a SvelteKit form action, NOT a /api/v1 endpoint.
// The session cookies are HttpOnly, so only the server can clear them.
export const actions: Actions = {
  default: ({ cookies }) => {
    clearSession(cookies);
    throw redirect(303, '/sign-in');
  }
};
