import { redirect } from '@sveltejs/kit';
import { findUserById } from '$lib/services/db';
import type { LayoutServerLoad } from './$types';

// Server-side auth guard for the whole dashboard. locals.userId is set by the
// hook from the access_token cookie; if absent, bounce to sign-in. Loads the
// profile via the shared service (no /api round-trip).
export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.userId) {
    throw redirect(307, '/sign-in');
  }

  const profile = await findUserById(locals.userId);

  if (!profile) {
    throw redirect(307, '/sign-in');
  }

  return { profile };
};
