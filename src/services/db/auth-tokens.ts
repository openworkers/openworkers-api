import { kysely } from './kysely-client';
import { uuid, timestamptz, now, enumCast } from './kysely-helpers';

export type TokenType = 'set_password' | 'password_reset';

interface AuthToken {
  id: string;
  userId: string;
  token: string;
  type: TokenType;
  expiresAt: Date;
  createdAt: Date;
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createAuthToken(userId: string, type: TokenType, expiresInMs: number): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + expiresInMs);

  await kysely
    .insertInto('authTokens')
    .values({
      userId: uuid(userId),
      token,
      type: enumCast(type, 'auth_token_type'),
      expiresAt: timestamptz(expiresAt)
    })
    .execute();

  return token;
}

export async function findAuthToken(token: string, type: TokenType): Promise<AuthToken | null> {
  const authToken = await kysely
    .selectFrom('authTokens')
    .selectAll()
    .where('token', '=', token)
    .where('type', '=', enumCast(type, 'auth_token_type'))
    .where('expiresAt', '>', now())
    .executeTakeFirst();

  return authToken ?? null;
}

export async function deleteAuthToken(token: string): Promise<void> {
  await kysely.deleteFrom('authTokens').where('token', '=', token).execute();
}

export async function deleteUserTokens(userId: string, type: TokenType): Promise<void> {
  await kysely
    .deleteFrom('authTokens')
    .where('userId', '=', uuid(userId))
    .where('type', '=', enumCast(type, 'auth_token_type'))
    .execute();
}

export async function deleteExpiredTokens(): Promise<number> {
  const result = await kysely.deleteFrom('authTokens').where('expiresAt', '<', now()).returning('id').execute();

  return result.length;
}

// Token expiration times
export const TOKEN_EXPIRY = {
  SET_PASSWORD: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET: 60 * 60 * 1000 // 1 hour
};
