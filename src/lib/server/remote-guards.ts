import { redirect } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';

// Remote functions are served outside /api, so the hook lets anonymous calls through.
export function requireUserId(): string {
  const { locals } = getRequestEvent();

  if (!locals.userId) {
    redirect(303, '/sign-in');
  }

  return locals.userId;
}
