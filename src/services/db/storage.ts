import { sql } from './client';

export interface StorageConfigRow {
  id: string;
  name: string;
  desc: string | null;
  bucket: string;
  prefix: string | null;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string | null;
  region: string | null;
  publicUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const STORAGE_SELECT = `
  id,
  name,
  "desc",
  bucket,
  prefix,
  access_key_id as "accessKeyId",
  secret_access_key as "secretAccessKey",
  endpoint,
  region,
  public_url as "publicUrl",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

export async function findAllStorageConfigs(userId: string): Promise<StorageConfigRow[]> {
  return sql<StorageConfigRow>(
    `SELECT ${STORAGE_SELECT}
    FROM storage_configs
    WHERE user_id = $1::uuid
    ORDER BY created_at DESC`,
    [userId]
  );
}

export async function findStorageConfigById(userId: string, id: string): Promise<StorageConfigRow | null> {
  const rows = await sql<StorageConfigRow>(
    `SELECT ${STORAGE_SELECT}
    FROM storage_configs
    WHERE user_id = $1::uuid AND id = $2::uuid`,
    [userId, id]
  );

  return rows[0] ?? null;
}

export async function findStorageConfigByName(userId: string, name: string): Promise<StorageConfigRow | null> {
  const rows = await sql<StorageConfigRow>(
    `SELECT ${STORAGE_SELECT}
    FROM storage_configs
    WHERE user_id = $1::uuid AND name = $2`,
    [userId, name]
  );

  return rows[0] ?? null;
}

export async function createStorageConfig(
  userId: string,
  name: string,
  bucket: string,
  accessKeyId: string,
  secretAccessKey: string,
  desc?: string,
  prefix?: string,
  endpoint?: string,
  region?: string,
  publicUrl?: string
): Promise<StorageConfigRow> {
  const rows = await sql<StorageConfigRow>(
    `INSERT INTO storage_configs (user_id, name, "desc", bucket, prefix, access_key_id, secret_access_key, endpoint, region, public_url)
    VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING ${STORAGE_SELECT}`,
    [
      userId,
      name,
      desc ?? null,
      bucket,
      prefix ?? null,
      accessKeyId,
      secretAccessKey,
      endpoint ?? null,
      region ?? null,
      publicUrl ?? null
    ]
  );

  return rows[0]!;
}

export interface StorageConfigUpdateInput {
  name?: string;
  desc?: string | null;
  bucket?: string;
  prefix?: string | null;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string | null;
  region?: string | null;
  publicUrl?: string | null;
}

export async function updateStorageConfig(
  userId: string,
  id: string,
  input: StorageConfigUpdateInput
): Promise<StorageConfigRow | null> {
  // Build dynamic update
  const updates: string[] = [];
  const values: (string | null)[] = [userId, id];
  let paramIndex = 3;

  const fieldMappings: { key: keyof StorageConfigUpdateInput; column: string }[] = [
    { key: 'name', column: 'name' },
    { key: 'desc', column: '"desc"' },
    { key: 'bucket', column: 'bucket' },
    { key: 'prefix', column: 'prefix' },
    { key: 'accessKeyId', column: 'access_key_id' },
    { key: 'secretAccessKey', column: 'secret_access_key' },
    { key: 'endpoint', column: 'endpoint' },
    { key: 'region', column: 'region' },
    { key: 'publicUrl', column: 'public_url' }
  ];

  for (const { key, column } of fieldMappings) {
    if (input[key] !== undefined) {
      updates.push(`${column} = $${paramIndex}`);
      values.push(input[key] as string | null);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    return findStorageConfigById(userId, id);
  }

  updates.push(`updated_at = now()`);

  const rows = await sql<StorageConfigRow>(
    `UPDATE storage_configs
    SET ${updates.join(', ')}
    WHERE user_id = $1::uuid AND id = $2::uuid
    RETURNING ${STORAGE_SELECT}`,
    values
  );

  return rows[0] ?? null;
}

export async function deleteStorageConfig(userId: string, id: string): Promise<number> {
  const result = await sql<{ id: string }>(
    `DELETE FROM storage_configs
    WHERE user_id = $1::uuid AND id = $2::uuid
    RETURNING id`,
    [userId, id]
  );

  return result.length;
}

export async function countStorageConfigs(userId: string): Promise<number> {
  const rows = await sql<{ count: string }>(
    `SELECT COUNT(*)::text as count
    FROM storage_configs
    WHERE user_id = $1::uuid`,
    [userId]
  );

  return parseInt(rows[0]?.count ?? '0', 10);
}
