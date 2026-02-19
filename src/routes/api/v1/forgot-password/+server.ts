import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/services/auth';
import { ForgotPasswordInputSchema } from '$lib/types';
import { parseAndValidate } from '$lib/server/validate';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const input = await parseAndValidate(request, ForgotPasswordInputSchema);

    await authService.requestPasswordReset(input.email);

    // Always return success to prevent user enumeration
    return json({
      message: 'If an account exists with this email, you will receive a password reset link.'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return json({
      message: 'If an account exists with this email, you will receive a password reset link.'
    });
  }
};
