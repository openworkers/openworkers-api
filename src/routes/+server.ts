import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// The dashboard has no landing page: the root opens it, or its sign-in.
export const GET: RequestHandler = ({ locals }) => {
  throw redirect(307, locals.userId ? '/workers' : '/sign-in');
};
