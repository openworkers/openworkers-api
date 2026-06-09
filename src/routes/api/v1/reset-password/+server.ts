// @deprecated — kept for the legacy Angular dashboard. The new UI BFFs this
// flow as a SvelteKit form action/load; tokens are set as HttpOnly cookies
// server-side (see src/routes/(dash)/sign-in/**).
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/services/auth';
import { ResetPasswordInputSchema, LoginResponseSchema } from '$lib/types';
import { parseAndValidate, jsonResponse } from '$lib/server/validate';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const input = await parseAndValidate(request, ResetPasswordInputSchema);

    const user = await authService.resetPassword(input.token, input.password);
    const tokens = await authService.createTokens(user);

    const response = jsonResponse(LoginResponseSchema, tokens);
    response.headers.append(
      'Set-Cookie',
      `access_token=${tokens.accessToken}; HttpOnly; Secure; SameSite=Strict; Path=/`
    );
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      return json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    console.error('Password reset error:', error);
    return json({ error: 'Password reset failed' }, { status: 500 });
  }
};
