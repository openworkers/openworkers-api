import { fail, redirect } from '@sveltejs/kit';
import { authService } from '$lib/services/auth';
import { setSession } from '$lib/server/auth-cookies';
import type { Actions } from './$types';

// BFF: validate the reset token, mint a session into HttpOnly cookies.
export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const token = String(data.get('token') ?? '');
    const password = String(data.get('password') ?? '');

    if (!token) {
      return fail(400, { error: 'Missing or invalid token.' });
    }

    let user;
    try {
      user = await authService.resetPassword(token, password);
    } catch {
      return fail(400, { error: 'Invalid or expired reset link.' });
    }

    setSession(cookies, await authService.createTokens(user));
    throw redirect(303, '/workers');
  }
};
