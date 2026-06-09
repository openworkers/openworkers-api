// @deprecated — kept for the legacy Angular dashboard. The new UI BFFs this
// flow as a SvelteKit form action/load; tokens are set as HttpOnly cookies
// server-side (see src/routes/(dash)/sign-in/**).
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/services/auth';
import { SetPasswordInputSchema, LoginResponseSchema } from '$lib/types';
import { parseAndValidate, jsonResponse } from '$lib/server/validate';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const input = await parseAndValidate(request, SetPasswordInputSchema);

    const user = await authService.setPassword(input.token, input.password);
    const tokens = await authService.createTokens(user);

    const response = jsonResponse(LoginResponseSchema, tokens);
    response.headers.append(
      'Set-Cookie',
      `access_token=${tokens.accessToken}; HttpOnly; Secure; SameSite=Strict; Path=/`
    );
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      return json({ error: 'Invalid or expired link' }, { status: 400 });
    }

    console.error('Set password error:', error);
    return json({ error: 'Failed to set password' }, { status: 500 });
  }
};
