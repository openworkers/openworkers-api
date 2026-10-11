import { form } from '$app/server';
import { authService } from '#lib/services/auth.ts';
import { ForgotPasswordInputSchema } from '#lib/types/index.ts';

export const requestPasswordReset = form(ForgotPasswordInputSchema, async ({ email }) => {
  try {
    await authService.requestPasswordReset(email);
  } catch (error) {
    console.error('Password reset request error:', error);
  }

  // The same answer in all cases, so the form does not tell which emails have an account
  return { message: 'If an account exists with this email, you will receive a password reset link.' };
});
