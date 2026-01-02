import { sql } from './client';

export type TokenType = 'set_password' | 'password_reset';

interface AuthToken {
  id: string;
  userId: string;
  token: string;
  type: TokenType;
  expiresAt: Date;
  createdAt: Date;
}

interface AuthTokenRow {
  id: string;
  user_id: string;
  token: string;
  type: TokenType;
  expires_at: string;
  created_at: string;
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createAuthToken(
  userId: string,
  type: TokenType,
  expiresInMs: number
): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + expiresInMs);

  await sql(
    `INSERT INTO auth_tokens (user_id, token, type, expires_at)
     VALUES ($1::uuid, $2, $3::auth_token_type, $4::timestamptz)`,
    [userId, token, type, expiresAt.toISOString()]
  );

  return token;
}

export async function findAuthToken(token: string, type: TokenType): Promise<AuthToken | null> {
  const rows = await sql<AuthTokenRow>(
    `SELECT id, user_id, token, type, expires_at, created_at
     FROM auth_tokens
     WHERE token = $1 AND type = $2::auth_token_type AND expires_at > NOW()`,
    [token, type]
  );

  if (!rows[0]) {
    return null;
  }

  return {
    id: rows[0].id,
    userId: rows[0].user_id,
    token: rows[0].token,
    type: rows[0].type,
    expiresAt: new Date(rows[0].expires_at),
    createdAt: new Date(rows[0].created_at)
  };
}

export async function deleteAuthToken(token: string): Promise<void> {
  await sql(`DELETE FROM auth_tokens WHERE token = $1`, [token]);
}

export async function deleteUserTokens(userId: string, type: TokenType): Promise<void> {
  await sql(`DELETE FROM auth_tokens WHERE user_id = $1::uuid AND type = $2::auth_token_type`, [userId, type]);
}

export async function deleteExpiredTokens(): Promise<number> {
  const result = await sql<{ count: string }>(
    `WITH deleted AS (
       DELETE FROM auth_tokens WHERE expires_at < NOW() RETURNING *
     )
     SELECT COUNT(*) as count FROM deleted`
  );

  return parseInt(result[0]?.count ?? '0', 10);
}

// Token expiration times
export const TOKEN_EXPIRY = {
  SET_PASSWORD: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET: 60 * 60 * 1000 // 1 hour
} as const;
