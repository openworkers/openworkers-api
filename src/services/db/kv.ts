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
  const result = await sql<{ id: string }>(
    `DELETE FROM kv_configs
    WHERE user_id = $1::uuid AND id = $2::uuid
    RETURNING id`,
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

// ============ KV Data Operations ============

export interface KvDataRow {
  key: string;
  value: unknown;  // JSONB - can be any JSON value
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KvDataListResult {
  items: KvDataRow[];
  cursor: string | null;
  hasMore: boolean;
}

const KV_DATA_SELECT = `
  key,
  value,
  expires_at as "expiresAt",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

export async function listKvData(
  namespaceId: string,
  options: { prefix?: string; cursor?: string; limit?: number }
): Promise<KvDataListResult> {
  const limit = Math.min(options.limit ?? 50, 100);
  const values: (string | number)[] = [namespaceId, limit + 1];
  let paramIndex = 3;

  let whereClause = 'namespace_id = $1::uuid';

  if (options.prefix) {
    whereClause += ` AND key LIKE $${paramIndex}`;
    values.push(options.prefix + '%');
    paramIndex++;
  }

  if (options.cursor) {
    whereClause += ` AND key > $${paramIndex}`;
    values.push(options.cursor);
    paramIndex++;
  }

  const rows = await sql<KvDataRow>(
    `SELECT ${KV_DATA_SELECT}
    FROM kv_data
    WHERE ${whereClause}
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY key ASC
    LIMIT $2`,
    values
  );

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const cursor = hasMore ? items[items.length - 1]?.key ?? null : null;

  return { items, cursor, hasMore };
}

export async function putKvData(
  namespaceId: string,
  key: string,
  value: unknown,
  expiresIn?: number
): Promise<KvDataRow> {
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

  // Serialize value to JSON string for JSONB column
  const jsonValue = JSON.stringify(value);

  const rows = await sql<KvDataRow>(
    `INSERT INTO kv_data (namespace_id, key, value, expires_at)
    VALUES ($1::uuid, $2, $3::jsonb, $4::timestamptz)
    ON CONFLICT (namespace_id, key)
    DO UPDATE SET value = $3::jsonb, expires_at = $4::timestamptz, updated_at = now()
    RETURNING ${KV_DATA_SELECT}`,
    [namespaceId, key, jsonValue, expiresAt?.toISOString() ?? null]
  );

  return rows[0]!;
}

export async function deleteKvData(namespaceId: string, key: string): Promise<boolean> {
  const result = await sql<{ key: string }>(
    `DELETE FROM kv_data
    WHERE namespace_id = $1::uuid AND key = $2
    RETURNING key`,
    [namespaceId, key]
  );

  return result.length > 0;
}
