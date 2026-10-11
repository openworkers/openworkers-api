import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Already signed in? Skip the login page.
export const load: PageServerLoad = ({ locals }) => {
  if (locals.userId) {
    throw redirect(307, '/workers');
  }
};
