// @deprecated — kept for the legacy Angular dashboard. The new UI BFFs this
// flow as a SvelteKit form action; tokens are set as HttpOnly cookies
// server-side (see src/routes/(dash)/sign-in/+page.server.ts and hooks.server.ts).
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/services/auth';
import { RegisterInputSchema } from '$lib/types';
import { parseAndValidate } from '$lib/server/validate';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const input = await parseAndValidate(request, RegisterInputSchema);

    await authService.registerWithEmail(input.email);

    return json({ message: 'Check your email to set your password and complete registration.' }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Email already registered') {
      return json({ error: 'Email already registered' }, { status: 409 });
    }

    console.error('Registration error:', error);
    return json({ error: 'Registration failed' }, { status: 500 });
  }
};
