import { sql } from './client';
import type { IEnvironment, IEnvironmentValue } from '../../types';

interface EnvironmentRow {
  id: string;
  name: string;
  desc: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  values: IEnvironment['values'];
  workers: IEnvironment['workers'];
}

interface EnvironmentValueRow {
  id: string;
  key: string;
  value: string;
  type: string;
}

// Environments
export async function findAllEnvironments(userId: string): Promise<IEnvironment[]> {
  return sql<EnvironmentRow>(
    `SELECT
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
          'value', CASE WHEN ev.type = 'secret' THEN '********' ELSE ev.value END,
          'type', ev.type
        )), '[]'::json)
        FROM environment_values ev
        WHERE ev.environment_id = e.id
      ) as values,
      (
        SELECT coalesce(json_agg(json_build_object(
          'id', w.id,
          'name', w.name,
          'createdAt', w.created_at,
          'updatedAt', w.updated_at
        )), '[]'::json)
        FROM workers w
        WHERE w.environment_id = e.id
      ) as workers
    FROM environments e
    WHERE e.user_id = $1::uuid
    ORDER BY e.created_at DESC`,
    [userId]
  );
}

export async function findEnvironmentById(userId: string, envId: string): Promise<IEnvironment | null> {
  const envs = await sql<EnvironmentRow>(
    `SELECT
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
          'value', CASE WHEN ev.type = 'secret' THEN '********' ELSE ev.value END,
          'type', ev.type
        )), '[]'::json)
        FROM environment_values ev
        WHERE ev.environment_id = e.id
      ) as values,
      (
        SELECT coalesce(json_agg(json_build_object(
          'id', w.id,
          'name', w.name,
          'createdAt', w.created_at,
          'updatedAt', w.updated_at
        )), '[]'::json)
        FROM workers w
        WHERE w.environment_id = e.id
      ) as workers
    FROM environments e
    WHERE e.id = $1::uuid AND e.user_id = $2::uuid`,
    [envId, userId]
  );
  return envs[0] ?? null;
}

export async function createEnvironment(userId: string, name: string, desc?: string | null): Promise<IEnvironment> {
  const envs = await sql<EnvironmentRow>(
    `INSERT INTO environments (name, "desc", user_id)
    VALUES ($1, $2, $3::uuid)
    RETURNING
      id,
      name,
      "desc",
      user_id as "userId",
      created_at as "createdAt",
      updated_at as "updatedAt"`,
    [name, desc ?? null, userId]
  );

  // Return with empty values and workers arrays
  return {
    ...envs[0]!,
    values: [],
    workers: []
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

  const envs = await sql<EnvironmentRow>(
    `UPDATE environments
    SET
      name = $1,
      "desc" = $2
    WHERE id = $3::uuid AND user_id = $4::uuid
    RETURNING
      id,
      name,
      "desc",
      user_id as "userId",
      created_at as "createdAt",
      updated_at as "updatedAt"`,
    [updates.name ?? current.name, updates.desc === undefined ? current.desc : updates.desc, envId, userId]
  );

  if (!envs[0]) return null;

  // Return updated environment with current values and workers
  return {
    ...envs[0],
    values: current.values,
    workers: current.workers
  };
}

export async function deleteEnvironment(userId: string, envId: string): Promise<number> {
  const result = await sql<{ id: string }>(
    `DELETE FROM environments
    WHERE id = $1::uuid AND user_id = $2::uuid
    RETURNING id`,
    [envId, userId]
  );
  return result.length;
}

// Environment Values
export async function createEnvironmentValue(
  userId: string,
  envId: string,
  key: string,
  value: string,
  type: string = 'var'
): Promise<IEnvironmentValue> {
  const vals = await sql<IEnvironmentValue>(
    `INSERT INTO environment_values (key, value, type, environment_id, user_id)
    VALUES ($1, $2, $3::enum_binding_type, $4::uuid, $5::uuid)
    RETURNING
      id,
      key,
      value,
      type,
      environment_id as "environmentId",
      user_id as "userId",
      created_at as "createdAt",
      updated_at as "updatedAt"`,
    [key, value, type, envId, userId]
  );
  return vals[0]!;
}

export async function updateEnvironmentValue(
  userId: string,
  valId: string,
  updates: { key?: string; value?: string; type?: string }
): Promise<IEnvironmentValue | null> {
  const current = await sql<EnvironmentValueRow>(
    `SELECT
      id,
      key,
      value,
      type
    FROM environment_values
    WHERE id = $1::uuid AND user_id = $2::uuid`,
    [valId, userId]
  );
  if (!current[0]) return null;

  const vals = await sql<IEnvironmentValue>(
    `UPDATE environment_values
    SET
      key = $1,
      value = $2,
      type = $3::enum_binding_type
    WHERE id = $4::uuid AND user_id = $5::uuid
    RETURNING
      id,
      key,
      value,
      type,
      environment_id as "environmentId",
      user_id as "userId",
      created_at as "createdAt",
      updated_at as "updatedAt"`,
    [updates.key ?? current[0].key, updates.value ?? current[0].value, updates.type ?? current[0].type, valId, userId]
  );
  return vals[0] ?? null;
}

export async function deleteEnvironmentValue(userId: string, valId: string): Promise<number> {
  const result = await sql<{ id: string }>(
    `DELETE FROM environment_values
    WHERE id = $1::uuid AND user_id = $2::uuid
    RETURNING id`,
    [valId, userId]
  );
  return result.length;
}

export async function deleteEnvironmentValuesByEnvId(userId: string, envId: string): Promise<number> {
  const result = await sql<{ id: string }>(
    `DELETE FROM environment_values
    WHERE environment_id = $1::uuid AND user_id = $2::uuid
    RETURNING id`,
    [envId, userId]
  );
  return result.length;
}
