import type { RequestHandler } from './$types';
import { authService } from '#lib/services/auth.ts';
import { ResendSetPasswordInputSchema } from '#lib/types/index.ts';
import { parseAndValidate } from '#lib/server/validate.ts';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const input = await parseAndValidate(request, ResendSetPasswordInputSchema);

    await authService.resendSetPasswordEmail(input.email);

    return Response.json({
      message: 'If a pending account exists with this email, a new link has been sent.'
    });
  } catch (error) {
    console.error('Resend set-password error:', error);
    return Response.json({
      message: 'If a pending account exists with this email, a new link has been sent.'
    });
  }
};
