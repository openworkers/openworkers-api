import { redirect } from '@sveltejs/kit';
import type { ISelf } from '$lib/types';
import type { LayoutLoad } from './$types';

// Auth guard for every page in the dashboard shell. Runs client-side (the
// parent (dash) layout is csr-only). If /profile 401s, bounce to sign-in.
export const load: LayoutLoad = async ({ fetch }) => {
  const res = await fetch('/api/v1/profile');

  if (!res.ok) {
    throw redirect(307, '/sign-in');
  }

  const profile: ISelf = await res.json();

  return { profile };
};
