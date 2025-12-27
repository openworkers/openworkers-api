import { sql } from './client';

export interface KvNamespaceRow {
  id: string;
  name: string;
  desc: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const KV_SELECT = `
  id,
  name,
  "desc",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

export async function findAllKvNamespaces(userId: string): Promise<KvNamespaceRow[]> {
  return sql<KvNamespaceRow>(
    `SELECT ${KV_SELECT}
    FROM kv_configs
    WHERE user_id = $1::uuid
    ORDER BY created_at DESC`,
    [userId]
  );
}

export async function findKvNamespaceById(userId: string, id: string): Promise<KvNamespaceRow | null> {
  const rows = await sql<KvNamespaceRow>(
    `SELECT ${KV_SELECT}
    FROM kv_configs
    WHERE user_id = $1::uuid AND id = $2::uuid`,
    [userId, id]
  );

  return rows[0] ?? null;
}

export async function findKvNamespaceByName(userId: string, name: string): Promise<KvNamespaceRow | null> {
  const rows = await sql<KvNamespaceRow>(
    `SELECT ${KV_SELECT}
    FROM kv_configs
    WHERE user_id = $1::uuid AND name = $2`,
    [userId, name]
  );

  return rows[0] ?? null;
}

export async function createKvNamespace(
  userId: string,
  name: string,
  desc?: string
): Promise<KvNamespaceRow> {
  const rows = await sql<KvNamespaceRow>(
    `INSERT INTO kv_configs (user_id, name, "desc")
    VALUES ($1::uuid, $2, $3)
    RETURNING ${KV_SELECT}`,
    [userId, name, desc ?? null]
  );

  return rows[0]!;
}

export async function updateKvNamespace(
  userId: string,
  id: string,
  name?: string,
  desc?: string | null
): Promise<KvNamespaceRow | null> {
  // Build dynamic update
  const updates: string[] = [];
  const values: (string | null)[] = [userId, id];
  let paramIndex = 3;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    values.push(name);
    paramIndex++;
  }

  if (desc !== undefined) {
    updates.push(`"desc" = $${paramIndex}`);
    values.push(desc);
    paramIndex++;
  }

  if (updates.length === 0) {
    return findKvNamespaceById(userId, id);
  }

  updates.push(`updated_at = now()`);

  const rows = await sql<KvNamespaceRow>(
    `UPDATE kv_configs
    SET ${updates.join(', ')}
    WHERE user_id = $1::uuid AND id = $2::uuid
    RETURNING ${KV_SELECT}`,
    values
  );

  return rows[0] ?? null;
}

export async function deleteKvNamespace(userId: string, id: string): Promise<number> {
  const result = await sql(
    `DELETE FROM kv_configs
    WHERE user_id = $1::uuid AND id = $2::uuid`,
    [userId, id]
  );

  return result.length;
}

export async function countKvNamespaces(userId: string): Promise<number> {
  const rows = await sql<{ count: string }>(
    `SELECT COUNT(*)::text as count
    FROM kv_configs
    WHERE user_id = $1::uuid`,
    [userId]
  );

  return parseInt(rows[0]?.count ?? '0', 10);
}
