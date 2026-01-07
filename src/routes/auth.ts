import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';
import { ZodError } from 'zod';

import { authService } from '../services/auth';
import { github as githubConfig, jwt as jwtConfig } from '../config';
import {
  LoginResponseSchema,
  RegisterInputSchema,
  SetPasswordInputSchema,
  LoginInputSchema,
  ForgotPasswordInputSchema,
  ResetPasswordInputSchema,
  ResendSetPasswordInputSchema
} from '../types';
import { jsonResponse } from '../utils/validate';

const auth = new Hono();

// ============================================================================
// GitHub OAuth
// ============================================================================

auth.post('/openid/github', (c) => {
  if (!githubConfig.clientId) {
    return c.json({ error: 'GitHub OAuth not configured' }, 500);
  }

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', githubConfig.clientId);

  return c.redirect(githubAuthUrl.toString());
});

auth.get('/callback/github', async (c) => {
  const code = c.req.query('code');

  if (!code) {
    return c.json({ error: 'Missing code parameter' }, 400);
  }

  if (!githubConfig.clientId || !githubConfig.clientSecret) {
    return c.json({ error: 'GitHub OAuth not configured' }, 500);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        client_id: githubConfig.clientId,
        client_secret: githubConfig.clientSecret,
        code
      })
    });

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      error?: string;
    };

    if (!tokenData.access_token) {
      return c.json(
        {
          error: 'Failed to get GitHub access token',
          details: tokenData.error
        },
        401
      );
    }

    // Get user profile from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json'
      }
    });

    const githubUser = (await userResponse.json()) as {
      id: number;
      login: string;
      avatar_url: string;
    };

    // Find or create user in our DB
    const user = await authService.findOrCreateGitHubUser(githubUser);

    // Create JWT tokens
    const tokens = await authService.createTokens(user);

    // Set access_token cookie
    setCookie(c, 'access_token', tokens.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict'
    });

    // Return both tokens in response body
    return jsonResponse(c, LoginResponseSchema, tokens);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return c.json(
      {
        error: 'Authentication failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

// ============================================================================
// Password Authentication (Email-first flow)
// ============================================================================

// Step 1: Register with email only (sends set-password link)
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const input = RegisterInputSchema.parse(body);

    await authService.registerWithEmail(input.email);

    return c.json(
      {
        message: 'Check your email to set your password and complete registration.'
      },
      201
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return c.json({ error: 'Invalid email format' }, 400);
    }

    if (error instanceof Error && error.message === 'Email already registered') {
      return c.json({ error: 'Email already registered' }, 409);
    }

    console.error('Registration error:', error);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

// Step 2: Set password using token from email
auth.post('/set-password', async (c) => {
  try {
    const body = await c.req.json();
    const input = SetPasswordInputSchema.parse(body);

    const user = await authService.setPassword(input.token, input.password);
    const tokens = await authService.createTokens(user);

    setCookie(c, 'access_token', tokens.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict'
    });

    return jsonResponse(c, LoginResponseSchema, tokens);
  } catch (error) {
    if (error instanceof ZodError) {
      return c.json({ error: 'Invalid token or password format' }, 400);
    }

    if (error instanceof Error && error.message === 'Invalid or expired token') {
      return c.json({ error: 'Invalid or expired link' }, 400);
    }

    console.error('Set password error:', error);
    return c.json({ error: 'Failed to set password' }, 500);
  }
});

// Login with email and password
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const input = LoginInputSchema.parse(body);

    const user = await authService.loginWithPassword(input.email, input.password);
    const tokens = await authService.createTokens(user);

    setCookie(c, 'access_token', tokens.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict'
    });

    return jsonResponse(c, LoginResponseSchema, tokens);
  } catch (error) {
    if (error instanceof ZodError) {
      return c.json({ error: 'Invalid email or password format' }, 400);
    }

    if (error instanceof Error && error.message === 'Invalid credentials') {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// Request password reset
auth.post('/forgot-password', async (c) => {
  try {
    const body = await c.req.json();
    const input = ForgotPasswordInputSchema.parse(body);

    await authService.requestPasswordReset(input.email);

    // Always return success to prevent user enumeration
    return c.json({
      message: 'If an account exists with this email, you will receive a password reset link.'
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return c.json({ error: 'Invalid email format' }, 400);
    }

    console.error('Password reset request error:', error);
    return c.json({
      message: 'If an account exists with this email, you will receive a password reset link.'
    });
  }
});

// Reset password with token
auth.post('/reset-password', async (c) => {
  try {
    const body = await c.req.json();
    const input = ResetPasswordInputSchema.parse(body);

    const user = await authService.resetPassword(input.token, input.password);
    const tokens = await authService.createTokens(user);

    setCookie(c, 'access_token', tokens.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict'
    });

    return jsonResponse(c, LoginResponseSchema, tokens);
  } catch (error) {
    if (error instanceof ZodError) {
      return c.json({ error: 'Invalid token or password format' }, 400);
    }

    if (error instanceof Error && error.message === 'Invalid or expired token') {
      return c.json({ error: 'Invalid or expired reset link' }, 400);
    }

    console.error('Password reset error:', error);
    return c.json({ error: 'Password reset failed' }, 500);
  }
});

// Resend set-password email
auth.post('/resend-set-password', async (c) => {
  try {
    const body = await c.req.json();
    const input = ResendSetPasswordInputSchema.parse(body);

    await authService.resendSetPasswordEmail(input.email);

    return c.json({
      message: 'If a pending account exists with this email, a new link has been sent.'
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return c.json({ error: 'Invalid email format' }, 400);
    }

    console.error('Resend set-password error:', error);
    return c.json({
      message: 'If a pending account exists with this email, a new link has been sent.'
    });
  }
});

// ============================================================================
// Token Refresh
// ============================================================================

auth.post('/refresh', async (c) => {
  const body = await c.req.json();
  const refreshToken = body.refreshToken;

  if (!refreshToken) {
    return c.json({ error: 'Missing refresh token' }, 400);
  }

  try {
    const payload = await verify(refreshToken, jwtConfig.refresh.secret);

    if (!payload.sub || typeof payload.sub !== 'string') {
      return c.json({ error: 'Invalid token payload' }, 401);
    }

    const tokens = await authService.refreshTokens(payload.sub);

    setCookie(c, 'access_token', tokens.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict'
    });

    return jsonResponse(c, LoginResponseSchema, tokens);
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    return c.json({ error: 'Invalid or expired refresh token' }, 401);
  }
});

export default auth;
