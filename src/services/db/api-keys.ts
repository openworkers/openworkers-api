import { sql } from './client';

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

interface ApiKeyRow {
  id: string;
  user_id: string;
  name: string;
  token_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

function rowToApiKey(row: ApiKeyRow): ApiKey {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    tokenPrefix: row.token_prefix,
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    createdAt: new Date(row.created_at)
  };
}

// Generate a random API key token
function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const random = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `ow_${random}`;
}

// Hash token using SHA-256
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Create a new API key - returns the full token (only time it's available)
export async function createApiKey(
  userId: string,
  name: string,
  expiresAt?: Date
): Promise<{ apiKey: ApiKey; token: string }> {
  const token = generateToken();
  const tokenPrefix = token.substring(0, 12);
  const tokenHash = await hashToken(token);

  const rows = await sql<ApiKeyRow>(
    `INSERT INTO api_keys (user_id, name, token_prefix, token_hash, expires_at)
     VALUES ($1::uuid, $2, $3, $4, $5::timestamptz)
     RETURNING id, user_id, name, token_prefix, last_used_at, expires_at, created_at`,
    [userId, name, tokenPrefix, tokenHash, expiresAt?.toISOString() ?? null]
  );

  return {
    apiKey: rowToApiKey(rows[0]!),
    token
  };
}

// Find API key by token (for authentication)
export async function findApiKeyByToken(token: string): Promise<ApiKey | null> {
  const tokenHash = await hashToken(token);

  const rows = await sql<ApiKeyRow>(
    `SELECT id, user_id, name, token_prefix, last_used_at, expires_at, created_at
     FROM api_keys
     WHERE token_hash = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
    [tokenHash]
  );

  return rows[0] ? rowToApiKey(rows[0]) : null;
}

// List user's API keys
export async function listApiKeys(userId: string): Promise<ApiKey[]> {
  const rows = await sql<ApiKeyRow>(
    `SELECT id, user_id, name, token_prefix, last_used_at, expires_at, created_at
     FROM api_keys
     WHERE user_id = $1::uuid
     ORDER BY created_at DESC`,
    [userId]
  );

  return rows.map(rowToApiKey);
}

// Delete an API key
export async function deleteApiKey(userId: string, keyId: string): Promise<boolean> {
  const result = await sql<{ count: string }>(
    `WITH deleted AS (
       DELETE FROM api_keys WHERE id = $1::uuid AND user_id = $2::uuid RETURNING *
     )
     SELECT COUNT(*) as count FROM deleted`,
    [keyId, userId]
  );

  return parseInt(result[0]?.count ?? '0', 10) > 0;
}

// Update last used timestamp
export async function updateApiKeyLastUsed(keyId: string): Promise<void> {
  await sql(`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1::uuid`, [keyId]);
}
