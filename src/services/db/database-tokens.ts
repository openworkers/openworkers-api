import { sql } from './client';
import type { DatabaseOperation } from '../../types/schemas/database-token.schema';

export interface DatabaseToken {
  id: string;
  databaseId: string;
  name: string;
  tokenPrefix: string;
  allowedOperations: DatabaseOperation[];
  lastUsedAt: Date | null;
  createdAt: Date;
}

interface DatabaseTokenRow {
  id: string;
  database_id: string;
  name: string;
  token_prefix: string;
  allowed_operations: DatabaseOperation[];
  last_used_at: string | null;
  created_at: string;
}

function rowToToken(row: DatabaseTokenRow): DatabaseToken {
  return {
    id: row.id,
    databaseId: row.database_id,
    name: row.name,
    tokenPrefix: row.token_prefix,
    allowedOperations: row.allowed_operations ?? [],
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
    createdAt: new Date(row.created_at)
  };
}

// Generate a Postgate-compatible token: pg_<64_hex_chars>
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const random = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `pg_${random}`;
}

// Hash token using SHA-256
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Convert array to PostgreSQL array literal format: {val1,val2}
function toPostgresArray(arr: string[]): string {
  return `{${arr.join(',')}}`;
}

// Create a new database token - returns the full token (only time it's available)
export async function createDatabaseToken(
  databaseId: string,
  name: string,
  allowedOperations: DatabaseOperation[]
): Promise<{ token: DatabaseToken; fullToken: string }> {
  const fullToken = generateToken();
  const tokenPrefix = fullToken.substring(0, 8);
  const tokenHash = await hashToken(fullToken);

  const rows = await sql<DatabaseTokenRow>(
    `INSERT INTO database_tokens (database_id, name, token_hash, token_prefix, allowed_operations)
     VALUES ($1::uuid, $2, $3, $4, $5::text[])
     RETURNING id, database_id, name, token_prefix, array_to_json(allowed_operations) as allowed_operations, last_used_at, created_at`,
    [databaseId, name, tokenHash, tokenPrefix, toPostgresArray(allowedOperations)]
  );

  return {
    token: rowToToken(rows[0]!),
    fullToken
  };
}

// List tokens for a database
export async function listDatabaseTokens(databaseId: string): Promise<DatabaseToken[]> {
  const rows = await sql<DatabaseTokenRow>(
    `SELECT id, database_id, name, token_prefix, array_to_json(allowed_operations) as allowed_operations, last_used_at, created_at
     FROM database_tokens
     WHERE database_id = $1::uuid
     ORDER BY created_at DESC`,
    [databaseId]
  );

  return rows.map(rowToToken);
}

// Delete a database token
export async function deleteDatabaseToken(databaseId: string, tokenId: string): Promise<boolean> {
  const result = await sql<{ count: string }>(
    `WITH deleted AS (
       DELETE FROM database_tokens WHERE id = $1::uuid AND database_id = $2::uuid RETURNING *
     )
     SELECT COUNT(*) as count FROM deleted`,
    [tokenId, databaseId]
  );

  return parseInt(result[0]?.count ?? '0', 10) > 0;
}

// Update last used timestamp (fire-and-forget)
export async function updateTokenLastUsed(tokenId: string): Promise<void> {
  await sql(`UPDATE database_tokens SET last_used_at = NOW() WHERE id = $1::uuid`, [tokenId]);
}
