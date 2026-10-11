import { invalid, redirect } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import { ServiceError } from '#lib/services/errors.ts';

// Remote functions are served outside /api, so the hook lets anonymous calls through.
export function requireUserId(): string {
  const { locals } = getRequestEvent();

  if (!locals.userId) {
    redirect(303, '/sign-in');
  }

  return locals.userId;
}

// Show a refused request as a form issue, not as an error page.
export async function issueOnServiceError<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ServiceError) {
      invalid(error.message);
    }

    throw error;
  }
}
