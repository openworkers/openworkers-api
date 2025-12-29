import { sql } from './client';
import type { DatabaseProvider } from '../../types';

interface DatabaseConfigRow {
  id: string;
  name: string;
  desc: string | null;
  userId: string;
  provider: DatabaseProvider;
  connectionString: string | null;
  schemaName: string | null;
  maxRows: number;
  timeoutSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

const SELECT_FIELDS = `
  id,
  name,
  "desc",
  user_id as "userId",
  provider::text,
  connection_string as "connectionString",
  schema_name as "schemaName",
  max_rows as "maxRows",
  timeout_seconds as "timeoutSeconds",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

export async function findAllDatabases(userId: string): Promise<DatabaseConfigRow[]> {
  return sql<DatabaseConfigRow>(
    `SELECT ${SELECT_FIELDS}
    FROM database_configs
    WHERE user_id = $1::uuid
    ORDER BY created_at DESC`,
    [userId]
  );
}

export async function findDatabaseById(userId: string, id: string): Promise<DatabaseConfigRow | null> {
  const rows = await sql<DatabaseConfigRow>(
    `SELECT ${SELECT_FIELDS}
    FROM database_configs
    WHERE id = $1::uuid AND user_id = $2::uuid`,
    [id, userId]
  );
  return rows[0] ?? null;
}

export async function findDatabaseByName(userId: string, name: string): Promise<DatabaseConfigRow | null> {
  const rows = await sql<DatabaseConfigRow>(
    `SELECT ${SELECT_FIELDS}
    FROM database_configs
    WHERE name = $1 AND user_id = $2::uuid`,
    [name, userId]
  );
  return rows[0] ?? null;
}

interface CreatePlatformInput {
  name: string;
  desc?: string | null;
  schemaName: string;
  maxRows: number;
  timeoutSeconds: number;
}

export async function createPlatformDatabase(userId: string, input: CreatePlatformInput): Promise<DatabaseConfigRow> {
  const rows = await sql<DatabaseConfigRow>(
    `INSERT INTO database_configs (
      user_id,
      name,
      "desc",
      provider,
      schema_name,
      max_rows,
      timeout_seconds
    )
    VALUES ($1::uuid, $2, $3, 'platform', $4, $5, $6)
    RETURNING ${SELECT_FIELDS}`,
    [userId, input.name, input.desc ?? null, input.schemaName, input.maxRows, input.timeoutSeconds]
  );
  return rows[0]!;
}

interface CreatePostgresInput {
  name: string;
  desc?: string | null;
  connectionString: string;
  maxRows: number;
  timeoutSeconds: number;
}

export async function createPostgresDatabase(userId: string, input: CreatePostgresInput): Promise<DatabaseConfigRow> {
  const rows = await sql<DatabaseConfigRow>(
    `INSERT INTO database_configs (
      user_id,
      name,
      "desc",
      provider,
      connection_string,
      max_rows,
      timeout_seconds
    )
    VALUES ($1::uuid, $2, $3, 'postgres', $4, $5, $6)
    RETURNING ${SELECT_FIELDS}`,
    [userId, input.name, input.desc ?? null, input.connectionString, input.maxRows, input.timeoutSeconds]
  );
  return rows[0]!;
}

export async function deleteDatabase(userId: string, id: string): Promise<number> {
  const result = await sql<{ id: string }>(
    `DELETE FROM database_configs
    WHERE id = $1::uuid AND user_id = $2::uuid
    RETURNING id`,
    [id, userId]
  );
  return result.length;
}

interface UpdateDatabaseInput {
  name?: string;
  desc?: string | null;
  maxRows?: number;
  timeoutSeconds?: number;
}

export async function updateDatabase(
  userId: string,
  id: string,
  input: UpdateDatabaseInput
): Promise<DatabaseConfigRow | null> {
  // Build SET clause dynamically
  const updates: string[] = [];
  const params: (string | number | null)[] = [id, userId];
  let paramIndex = 3;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    params.push(input.name);
    paramIndex++;
  }

  if (input.desc !== undefined) {
    updates.push(`"desc" = $${paramIndex}`);
    params.push(input.desc);
    paramIndex++;
  }

  if (input.maxRows !== undefined) {
    updates.push(`max_rows = $${paramIndex}`);
    params.push(input.maxRows);
    paramIndex++;
  }

  if (input.timeoutSeconds !== undefined) {
    updates.push(`timeout_seconds = $${paramIndex}`);
    params.push(input.timeoutSeconds);
    paramIndex++;
  }

  if (updates.length === 0) {
    return findDatabaseById(userId, id);
  }

  const rows = await sql<DatabaseConfigRow>(
    `UPDATE database_configs
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE id = $1::uuid AND user_id = $2::uuid
    RETURNING ${SELECT_FIELDS}`,
    params
  );

  return rows[0] ?? null;
}
