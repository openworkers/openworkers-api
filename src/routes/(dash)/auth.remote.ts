import { invalid, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { command, form, getRequestEvent } from '$app/server';
import { authService } from '#lib/services/auth.ts';
import { clearSession, setSession } from '#lib/server/auth-cookies.ts';
import { startGithubOAuth } from '#lib/server/github-oauth.ts';
import {
  LoginInputSchema,
  RegisterInputSchema,
  ResetPasswordInputSchema,
  SetPasswordInputSchema
} from '#lib/types/schemas/auth.schema.ts';

// Fields that start with '_' are not sent back when the form is invalid, so a password never comes back in the page

export const signIn = form(
  z.object({ email: LoginInputSchema.shape.email, _password: LoginInputSchema.shape.password }),
  async ({ email, _password }) => {
    let user;

    try {
      user = await authService.loginWithPassword(email, _password);
    } catch {
      invalid('Invalid email or password');
    }

    setSession(getRequestEvent().cookies, await authService.createTokens(user));
    redirect(303, '/workers');
  }
);

export const register = form(RegisterInputSchema, async ({ email }) => {
  try {
    await authService.registerWithEmail(email);
  } catch (error) {
    invalid(
      error instanceof Error && error.message === 'Email already registered' ? error.message : 'Registration failed'
    );
  }

  return { message: 'Check your email to set your password.' };
});

export const signInWithGithub = form(async () => {
  const authUrl = startGithubOAuth(getRequestEvent().cookies);

  if (!authUrl) {
    invalid('GitHub sign-in is not configured on this platform');
  }

  redirect(303, authUrl, { external: true });
});

function passwordSchema(schema: typeof SetPasswordInputSchema | typeof ResetPasswordInputSchema) {
  return z
    .object({ token: schema.shape.token, _password: schema.shape.password, _confirm: z.string() })
    .refine((input) => input._password === input._confirm, { message: 'Passwords do not match.', path: ['_confirm'] });
}

export const setPassword = form(passwordSchema(SetPasswordInputSchema), async ({ token, _password }) => {
  let user;

  try {
    user = await authService.setPassword(token, _password);
  } catch {
    invalid('Invalid or expired link.');
  }

  setSession(getRequestEvent().cookies, await authService.createTokens(user));
  redirect(303, '/workers');
});

export const resetPassword = form(passwordSchema(ResetPasswordInputSchema), async ({ token, _password }) => {
  let user;

  try {
    user = await authService.resetPassword(token, _password);
  } catch {
    invalid('Invalid or expired reset link.');
  }

  setSession(getRequestEvent().cookies, await authService.createTokens(user));
  redirect(303, '/workers');
});

export const signOut = form(async () => {
  clearSession(getRequestEvent().cookies);
  redirect(303, '/sign-in');
});

// Any request refreshes an expired access cookie in the hook; this one only reports whether a session remains
export const checkSession = command(() => Boolean(getRequestEvent().locals.userId));
