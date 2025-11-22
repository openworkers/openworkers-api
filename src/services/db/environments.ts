import { sql } from "./client";
import type { IEnvironment, IEnvironmentValue } from "../../types";

// Environments
export async function findAllEnvironments(userId: string): Promise<IEnvironment[]> {
  return sql`
    SELECT id, name, user_id as "userId", created_at as "createdAt", updated_at as "updatedAt"
    FROM environments
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
}

export async function findEnvironmentById(
  userId: string,
  envId: string
): Promise<IEnvironment | null> {
  const envs = await sql`
    SELECT id, name, user_id as "userId", created_at as "createdAt", updated_at as "updatedAt"
    FROM environments
    WHERE id = ${envId} AND user_id = ${userId}
  `;
  return envs[0] || null;
}

export async function createEnvironment(
  userId: string,
  name: string
): Promise<IEnvironment> {
  const id = crypto.randomUUID();
  // TODO: Let DB handle ID and timestamps
  const envs = await sql`
    INSERT INTO environments (id, name, user_id, created_at, updated_at)
    VALUES (${id}, ${name}, ${userId}, NOW(), NOW())
    RETURNING id, name, user_id as "userId", created_at as "createdAt", updated_at as "updatedAt"
  `;
  return envs[0];
}

export async function updateEnvironment(
  userId: string,
  envId: string,
  name: string
): Promise<IEnvironment | null> {
  const envs = await sql`
    UPDATE environments
    SET name = ${name}, updated_at = NOW()
    WHERE id = ${envId} AND user_id = ${userId}
    RETURNING id, name, user_id as "userId", created_at as "createdAt", updated_at as "updatedAt"
  `;
  return envs[0] || null;
}

export async function deleteEnvironment(
  userId: string,
  envId: string
): Promise<number> {
  const result = await sql`
    DELETE FROM environments
    WHERE id = ${envId} AND user_id = ${userId}
  `;
  return result.count || 0;
}

// Environment Values
export async function findAllEnvironmentValues(
  userId: string,
  envId: string
): Promise<IEnvironmentValue[]> {
  // Verify ownership first
  const env = await findEnvironmentById(userId, envId);
  if (!env) return [];

  return sql`
    SELECT id, key, value, secret, environment_id as "environmentId", user_id as "userId", created_at as "createdAt", updated_at as "updatedAt"
    FROM environment_values
    WHERE environment_id = ${envId}
  `;
}

export async function createEnvironmentValue(
  userId: string,
  envId: string,
  key: string,
  value: string,
  secret: boolean
): Promise<IEnvironmentValue> {
  const id = crypto.randomUUID();
  // TODO: Let DB handle ID and timestamps
  const vals = await sql`
    INSERT INTO environment_values (id, key, value, secret, environment_id, user_id, created_at, updated_at)
    VALUES (${id}, ${key}, ${value}, ${secret}, ${envId}, ${userId}, NOW(), NOW())
    RETURNING id, key, value, secret, environment_id as "environmentId", user_id as "userId", created_at as "createdAt", updated_at as "updatedAt"
  `;
  return vals[0];
}

export async function updateEnvironmentValue(
  userId: string,
  valId: string,
  updates: { key?: string; value?: string; secret?: boolean }
): Promise<IEnvironmentValue | null> {
  const current = await sql`
    SELECT * FROM environment_values WHERE id = ${valId} AND user_id = ${userId}
  `;
  if (!current[0]) return null;

  const vals = await sql`
    UPDATE environment_values
    SET
      key = ${updates.key ?? current[0].key},
      value = ${updates.value ?? current[0].value},
      secret = ${updates.secret ?? current[0].secret},
      updated_at = NOW()
    WHERE id = ${valId} AND user_id = ${userId}
    RETURNING id, key, value, secret, environment_id as "environmentId", user_id as "userId", created_at as "createdAt", updated_at as "updatedAt"
  `;
  return vals[0] || null;
}

export async function deleteEnvironmentValue(
  userId: string,
  valId: string
): Promise<number> {
  const result = await sql`
    DELETE FROM environment_values
    WHERE id = ${valId} AND user_id = ${userId}
  `;
  return result.count || 0;
}

export async function deleteEnvironmentValuesByEnvId(
  userId: string,
  envId: string
): Promise<number> {
  const result = await sql`
        DELETE FROM environment_values
        WHERE environment_id = ${envId} AND user_id = ${userId}
    `;
  return result.count || 0;
}
