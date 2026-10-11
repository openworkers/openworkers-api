// @deprecated — kept for the legacy Angular dashboard. The new UI BFFs this
// flow as a SvelteKit form action/load; tokens are set as HttpOnly cookies
// server-side (see src/routes/(dash)/sign-in/**).
import type { RequestHandler } from './$types';
import { authService } from '#lib/services/auth.ts';
import { ResetPasswordInputSchema, LoginResponseSchema } from '#lib/types/index.ts';
import { parseAndValidate, jsonResponse } from '#lib/server/validate.ts';

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
      return Response.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    console.error('Password reset error:', error);
    return Response.json({ error: 'Password reset failed' }, { status: 500 });
  }
};
