import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/services/auth';
import { ResendSetPasswordInputSchema } from '$lib/types';
import { parseAndValidate } from '$lib/server/validate';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const input = await parseAndValidate(request, ResendSetPasswordInputSchema);

    await authService.resendSetPasswordEmail(input.email);

    return json({
      message: 'If a pending account exists with this email, a new link has been sent.'
    });
  } catch (error) {
    console.error('Resend set-password error:', error);
    return json({
      message: 'If a pending account exists with this email, a new link has been sent.'
    });
  }
};
