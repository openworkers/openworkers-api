import { sql } from "./client";
import type { IEnvironment, IEnvironmentValue } from "../../types";

// Environments
export async function findAllEnvironments(userId: string): Promise<IEnvironment[]> {
  return sql`
    SELECT
      e.id,
      e.name,
      e."desc",
      e.user_id as "userId",
      e.created_at as "createdAt",
      e.updated_at as "updatedAt",
      (
        SELECT coalesce(json_agg(json_build_object(
          'id', ev.id,
          'key', ev.key,
          'value', CASE WHEN ev.secret THEN '********' ELSE ev.value END,
          'secret', ev.secret
        )), '[]'::json)
        FROM environment_values ev
        WHERE ev.environment_id = e.id
      ) as values,
      (
        SELECT coalesce(json_agg(json_build_object(
          'id', w.id,
          'name', w.name,
          'language', w.language,
          'userId', w.user_id,
          'createdAt', w.created_at,
          'updatedAt', w.updated_at
        )), '[]'::json)
        FROM workers w
        WHERE w.environment_id = e.id
      ) as workers
    FROM environments e
    WHERE e.user_id = ${userId}
    ORDER BY e.created_at DESC
  `;
}

export async function findEnvironmentById(
  userId: string,
  envId: string
): Promise<IEnvironment | null> {
  const envs = await sql`
    SELECT
      e.id,
      e.name,
      e."desc",
      e.user_id as "userId",
      e.created_at as "createdAt",
      e.updated_at as "updatedAt",
      (
        SELECT coalesce(json_agg(json_build_object(
          'id', ev.id,
          'key', ev.key,
          'value', CASE WHEN ev.secret THEN '********' ELSE ev.value END,
          'secret', ev.secret
        )), '[]'::json)
        FROM environment_values ev
        WHERE ev.environment_id = e.id
      ) as values,
      (
        SELECT coalesce(json_agg(json_build_object(
          'id', w.id,
          'name', w.name,
          'language', w.language,
          'userId', w.user_id,
          'createdAt', w.created_at,
          'updatedAt', w.updated_at
        )), '[]'::json)
        FROM workers w
        WHERE w.environment_id = e.id
      ) as workers
    FROM environments e
    WHERE e.id = ${envId} AND e.user_id = ${userId}
  `;
  return envs[0] || null;
}

export async function createEnvironment(
  userId: string,
  name: string,
  desc?: string | null
): Promise<IEnvironment> {
  const envs = await sql`
    INSERT INTO environments (name, "desc", user_id)
    VALUES (${name}, ${desc || null}, ${userId})
    RETURNING id, name, "desc", user_id as "userId", created_at as "createdAt", updated_at as "updatedAt"
  `;

  // Return with empty values and workers arrays
  return {
    ...envs[0],
    values: [],
    workers: [],
  };
}

export async function updateEnvironment(
  userId: string,
  envId: string,
  updates: { name?: string; desc?: string | null }
): Promise<IEnvironment | null> {
  // Get current values to merge updates
  const current = await findEnvironmentById(userId, envId);
  if (!current) return null;

  const envs = await sql`
    UPDATE environments
    SET
      name = ${updates.name ?? current.name},
      "desc" = ${updates.desc === undefined ? current.desc : updates.desc}
    WHERE id = ${envId} AND user_id = ${userId}
    RETURNING id, name, "desc", user_id as "userId", created_at as "createdAt", updated_at as "updatedAt"
  `;

  if (!envs[0]) return null;

  // Return updated environment with current values and workers
  return {
    ...envs[0],
    values: current.values,
    workers: current.workers,
  };
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
export async function createEnvironmentValue(
  userId: string,
  envId: string,
  key: string,
  value: string,
  secret: boolean
): Promise<IEnvironmentValue> {
  const vals = await sql`
    INSERT INTO environment_values (key, value, secret, environment_id, user_id)
    VALUES (${key}, ${value}, ${secret}, ${envId}, ${userId})
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
      secret = ${updates.secret ?? current[0].secret}
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
