import { sql } from './client';

interface DatabaseRow {
  id: string;
  name: string;
  userId: string;
  postgateId: string;
  schemaName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function findAllDatabases(userId: string): Promise<DatabaseRow[]> {
  return sql<DatabaseRow>(
    `SELECT
      id,
      name,
      user_id as "userId",
      postgate_id as "postgateId",
      schema_name as "schemaName",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM databases
    WHERE user_id = $1::uuid
    ORDER BY created_at DESC`,
    [userId]
  );
}

export async function findDatabaseById(userId: string, id: string): Promise<DatabaseRow | null> {
  const rows = await sql<DatabaseRow>(
    `SELECT
      id,
      name,
      user_id as "userId",
      postgate_id as "postgateId",
      schema_name as "schemaName",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM databases
    WHERE id = $1::uuid AND user_id = $2::uuid`,
    [id, userId]
  );
  return rows[0] ?? null;
}

export async function createDatabase(
  userId: string,
  name: string,
  postgateId: string,
  schemaName: string | null
): Promise<DatabaseRow> {
  const rows = await sql<DatabaseRow>(
    `INSERT INTO databases (name, user_id, postgate_id, schema_name)
    VALUES ($1, $2::uuid, $3::uuid, $4)
    RETURNING
      id,
      name,
      user_id as "userId",
      postgate_id as "postgateId",
      schema_name as "schemaName",
      created_at as "createdAt",
      updated_at as "updatedAt"`,
    [name, userId, postgateId, schemaName]
  );
  return rows[0]!;
}

export async function deleteDatabase(userId: string, id: string): Promise<number> {
  const result = await sql<{ id: string }>(
    `DELETE FROM databases
    WHERE id = $1::uuid AND user_id = $2::uuid
    RETURNING id`,
    [id, userId]
  );
  return result.length;
}
