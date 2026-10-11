import { error, invalid, redirect } from '@sveltejs/kit';
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

// Commands cannot redirect
export function requireUserIdInCommand(): string {
  const { locals } = getRequestEvent();

  if (!locals.userId) {
    error(401, 'Your session has expired. Sign in again.');
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

// The command version: a refused request becomes an error with the service status and message
export async function errorOnServiceError<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (e) {
    if (e instanceof ServiceError) {
      error(e.status, e.message);
    }

    throw e;
  }
}
