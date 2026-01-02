import { sign } from 'hono/jwt';

import {
  findUserByGitHub,
  createUserWithGitHub,
  findUserById,
  findUserByEmail,
  emailExists,
  getPasswordHash,
  createUserWithEmail,
  updatePassword
} from './db';
import {
  createAuthToken,
  findAuthToken,
  deleteAuthToken,
  deleteUserTokens,
  TOKEN_EXPIRY
} from './db/auth-tokens';
import { sendSetPasswordEmail, sendPasswordResetEmail } from './email';
import { hashPassword, verifyPassword } from '../utils/password';
import type { ISelf } from '../types';
import { jwt as jwtConfig } from '../config';

interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
}

// Parse JWT expiration to seconds
function parseExpiration(exp: string): number {
  const value = parseInt(exp);
  const unit = exp.slice(-1);

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 24 * 60 * 60;
    default:
      return parseInt(exp); // Assume seconds if no unit
  }
}

// Dummy hash for timing attack prevention
const DUMMY_HASH = '100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

export class AuthService {
  async findOrCreateGitHubUser(githubProfile: GitHubUser): Promise<ISelf> {
    const externalId = githubProfile.id.toString();

    // Check if user exists
    const existing = await findUserByGitHub(externalId);

    if (existing) {
      return existing;
    }

    // Create new user
    return createUserWithGitHub(externalId, githubProfile.login, githubProfile.avatar_url);
  }

  async createTokens(user: ISelf): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: user.id,
      iat: Math.floor(Date.now() / 1000)
    };

    const accessToken = await sign(
      {
        ...payload,
        exp: Math.floor(Date.now() / 1000) + parseExpiration(jwtConfig.access.expiresIn)
      },
      jwtConfig.access.secret
    );

    const refreshToken = await sign(
      {
        ...payload,
        exp: Math.floor(Date.now() / 1000) + parseExpiration(jwtConfig.refresh.expiresIn)
      },
      jwtConfig.refresh.secret
    );

    return { accessToken, refreshToken };
  }

  async refreshTokens(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await findUserById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return this.createTokens(user);
  }

  // ============================================================================
  // Password Authentication (Email-first flow)
  // ============================================================================

  /**
   * Step 1: Register with email only
   * Creates user without password and sends email with set-password link
   *
   * If user already exists but hasn't set password (pending state),
   * resend the email instead of failing - this handles:
   * - Email delivery failures on first attempt
   * - User retrying registration
   */
  async registerWithEmail(email: string): Promise<ISelf> {
    // Check if user already exists
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      // Check if user already has a password (fully registered)
      const hasPassword = await getPasswordHash(email);

      if (hasPassword) {
        throw new Error('Email already registered');
      }

      // User exists but hasn't set password yet (pending) - resend email
      await deleteUserTokens(existingUser.id, 'set_password');
      const token = await createAuthToken(existingUser.id, 'set_password', TOKEN_EXPIRY.SET_PASSWORD);
      await sendSetPasswordEmail(email, token);

      return existingUser;
    }

    // Create new user without password
    const user = await createUserWithEmail(email);

    // Create token and send email
    const token = await createAuthToken(user.id, 'set_password', TOKEN_EXPIRY.SET_PASSWORD);
    await sendSetPasswordEmail(email, token);

    return user;
  }

  /**
   * Step 2: Set password using token from email
   * This validates the email (user clicked the link) and sets the password
   */
  async setPassword(token: string, password: string): Promise<ISelf> {
    const authToken = await findAuthToken(token, 'set_password');

    if (!authToken) {
      throw new Error('Invalid or expired token');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Update password
    await updatePassword(authToken.userId, passwordHash);

    // Delete the token
    await deleteAuthToken(token);

    // Return user
    const user = await findUserById(authToken.userId);

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Login with email and password
   */
  async loginWithPassword(email: string, password: string): Promise<ISelf> {
    // Get stored hash
    const passwordHash = await getPasswordHash(email);

    if (!passwordHash) {
      // User doesn't exist or hasn't set password yet
      // Perform dummy verification to prevent timing attacks
      await verifyPassword(password, DUMMY_HASH);
      throw new Error('Invalid credentials');
    }

    // Verify password
    const valid = await verifyPassword(password, passwordHash);

    if (!valid) {
      throw new Error('Invalid credentials');
    }

    // Return user
    const user = await findUserByEmail(email);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    return user;
  }

  /**
   * Request password reset email
   */
  async requestPasswordReset(email: string): Promise<void> {
    // Check if user exists and has a password
    const user = await findUserByEmail(email);
    const hasPassword = await getPasswordHash(email);

    if (!user || !hasPassword) {
      // Don't reveal if user exists
      return;
    }

    // Delete any existing reset tokens
    await deleteUserTokens(user.id, 'password_reset');

    // Create new reset token
    const token = await createAuthToken(user.id, 'password_reset', TOKEN_EXPIRY.PASSWORD_RESET);

    // Send email
    await sendPasswordResetEmail(email, token);
  }

  /**
   * Reset password using token from email
   */
  async resetPassword(token: string, newPassword: string): Promise<ISelf> {
    const authToken = await findAuthToken(token, 'password_reset');

    if (!authToken) {
      throw new Error('Invalid or expired token');
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await updatePassword(authToken.userId, passwordHash);

    // Delete the token
    await deleteAuthToken(token);

    // Return user
    const user = await findUserById(authToken.userId);

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Resend set-password email for users who registered but didn't set password
   */
  async resendSetPasswordEmail(email: string): Promise<void> {
    const user = await findUserByEmail(email);

    if (!user) {
      return;
    }

    // Check if user already has a password
    const hasPassword = await getPasswordHash(email);

    if (hasPassword) {
      return;
    }

    // Delete existing tokens
    await deleteUserTokens(user.id, 'set_password');

    // Create new token and send email
    const token = await createAuthToken(user.id, 'set_password', TOKEN_EXPIRY.SET_PASSWORD);
    await sendSetPasswordEmail(email, token);
  }
}

export const authService = new AuthService();
