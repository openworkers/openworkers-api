import { sign } from 'hono/jwt';
import { findUserByGitHub, createUserWithGitHub, findUserById } from './db';
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
}

export const authService = new AuthService();
