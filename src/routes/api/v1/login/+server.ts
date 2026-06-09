// @deprecated — kept for the legacy Angular dashboard. The new UI BFFs this
// flow as a SvelteKit form action; tokens are set as HttpOnly cookies
// server-side (see src/routes/(dash)/sign-in/+page.server.ts and hooks.server.ts).
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/services/auth';
import { LoginInputSchema, LoginResponseSchema } from '$lib/types';
import { parseAndValidate, jsonResponse } from '$lib/server/validate';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const input = await parseAndValidate(request, LoginInputSchema);

    const user = await authService.loginWithPassword(input.email, input.password);
    const tokens = await authService.createTokens(user);

    const response = jsonResponse(LoginResponseSchema, tokens);
    response.headers.append(
      'Set-Cookie',
      `access_token=${tokens.accessToken}; HttpOnly; Secure; SameSite=Strict; Path=/`
    );
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid credentials') {
      return json({ error: 'Invalid email or password' }, { status: 401 });
    }

    console.error('Login error:', error);
    return json({ error: 'Login failed' }, { status: 500 });
  }
};
