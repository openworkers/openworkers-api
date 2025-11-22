import { sign } from 'hono/jwt';
import { findUserByGitHub, createUserWithGitHub, findUserById } from './db';
import type { ISelf } from '../types';

interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
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
    return createUserWithGitHub(
      externalId,
      githubProfile.login,
      githubProfile.avatar_url
    );
  }

  async createTokens(user: ISelf): Promise<{ accessToken: string; refreshToken: string }> {
    const secret = process.env.JWT_ACCESS_SECRET!;
    const refreshSecret = process.env.JWT_REFRESH_SECRET!;

    const payload = {
      userId: user.id,
      username: user.username,
    };

    const accessToken = await sign(
      {
        ...payload,
        exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
      },
      secret
    );

    const refreshToken = await sign(
      {
        ...payload,
        exp: Math.floor(Date.now() / 1000) + 18 * 60 * 60, // 18 hours
      },
      refreshSecret
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
