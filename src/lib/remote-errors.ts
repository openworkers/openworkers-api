import { isHttpError } from '@sveltejs/kit';

// The message of a failed command; SvelteKit hides the message of unexpected errors
export function remoteErrorMessage(e: unknown, fallback: string): string {
  return isHttpError(e) ? e.body.message : fallback;
}
