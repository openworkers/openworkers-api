import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

// UI-internal session op — a SvelteKit form action, NOT a /api/v1 endpoint.
// The access_token cookie is HttpOnly, so only the server can clear it.
export const actions: Actions = {
  default: ({ cookies }) => {
    cookies.delete('access_token', { path: '/' });
    throw redirect(303, '/sign-in');
  }
};
