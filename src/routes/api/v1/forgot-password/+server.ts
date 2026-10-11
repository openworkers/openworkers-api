import type { RequestHandler } from './$types';
import { authService } from '#lib/services/auth.ts';
import { ForgotPasswordInputSchema } from '#lib/types/index.ts';
import { parseAndValidate } from '#lib/server/validate.ts';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const input = await parseAndValidate(request, ForgotPasswordInputSchema);

    await authService.requestPasswordReset(input.email);

    // Always return success to prevent user enumeration
    return Response.json({
      message: 'If an account exists with this email, you will receive a password reset link.'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return Response.json({
      message: 'If an account exists with this email, you will receive a password reset link.'
    });
  }
};
