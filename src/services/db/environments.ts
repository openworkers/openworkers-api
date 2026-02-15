import { kysely } from './kysely-client';
import { uuid, enumCast } from './kysely-helpers';
import { sql } from 'kysely';
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
  const result = await sql<EnvironmentRow>`
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
          AND w.name IS NOT NULL
      ) as workers
    FROM environments e
    WHERE e.user_id = ${uuid(userId)}
    ORDER BY e.created_at DESC
  `.execute(kysely);

  return result.rows;
}

export async function findEnvironmentById(userId: string, envId: string): Promise<IEnvironment | null> {
  const result = await sql<EnvironmentRow>`
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
          AND w.name IS NOT NULL
      ) as workers
    FROM environments e
    WHERE e.id = ${uuid(envId)} AND e.user_id = ${uuid(userId)}
  `.execute(kysely);

  return result.rows[0] ?? null;
}

export async function findEnvironmentByName(userId: string, name: string): Promise<IEnvironment | null> {
  const result = await sql<EnvironmentRow>`
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
          AND w.name IS NOT NULL
      ) as workers
    FROM environments e
    WHERE e.name = ${name} AND e.user_id = ${uuid(userId)}
  `.execute(kysely);

  return result.rows[0] ?? null;
}

export async function createEnvironment(userId: string, name: string, desc?: string | null): Promise<IEnvironment> {
  const env = await kysely
    .insertInto('environments')
    .values({
      name,
      desc: desc ?? null,
      userId: uuid(userId)
    })
    .returning(['id', 'name', 'desc', 'userId', 'createdAt', 'updatedAt'])
    .executeTakeFirstOrThrow();

  // Return with empty values and workers arrays
  return {
    ...env,
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

  const updateData: Partial<{ name: string; desc: string | null }> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.desc !== undefined) updateData.desc = updates.desc;

  if (Object.keys(updateData).length === 0) {
    return current;
  }

  const env = await kysely
    .updateTable('environments')
    .set(updateData)
    .where('id', '=', uuid(envId))
    .where('userId', '=', uuid(userId))
    .returning(['id', 'name', 'desc', 'userId', 'createdAt', 'updatedAt'])
    .executeTakeFirst();

  if (!env) return null;

  // Return updated environment with current values and workers
  return {
    ...env,
    values: current.values,
    workers: current.workers
  };
}

export async function deleteEnvironment(userId: string, envId: string): Promise<number> {
  const result = await kysely
    .deleteFrom('environments')
    .where('id', '=', uuid(envId))
    .where('userId', '=', uuid(userId))
    .returning('id')
    .execute();

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
  return kysely
    .insertInto('environmentValues')
    .values({
      key,
      value,
      type: enumCast(type as 'var' | 'secret', 'enum_binding_type'),
      environmentId: uuid(envId),
      userId: uuid(userId)
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateEnvironmentValue(
  userId: string,
  valId: string,
  updates: { key?: string; value?: string; type?: string }
): Promise<IEnvironmentValue | null> {
  const current = await kysely
    .selectFrom('environmentValues')
    .select(['id', 'key', 'value', 'type'])
    .where('id', '=', uuid(valId))
    .where('userId', '=', uuid(userId))
    .executeTakeFirst();

  if (!current) return null;

  const updateData: Partial<{ key: string; value: string; type: any }> = {};
  if (updates.key !== undefined) updateData.key = updates.key;
  if (updates.value !== undefined) updateData.value = updates.value;
  if (updates.type !== undefined) updateData.type = enumCast(updates.type as 'var' | 'secret', 'enum_binding_type');

  if (Object.keys(updateData).length === 0) {
    const full = await kysely
      .selectFrom('environmentValues')
      .selectAll()
      .where('id', '=', uuid(valId))
      .executeTakeFirst();
    return full ?? null;
  }

  const val = await kysely
    .updateTable('environmentValues')
    .set(updateData)
    .where('id', '=', uuid(valId))
    .where('userId', '=', uuid(userId))
    .returningAll()
    .executeTakeFirst();

  return val ?? null;
}

export async function deleteEnvironmentValue(userId: string, valId: string): Promise<number> {
  const result = await kysely
    .deleteFrom('environmentValues')
    .where('id', '=', uuid(valId))
    .where('userId', '=', uuid(userId))
    .returning('id')
    .execute();

  return result.length;
}

export async function deleteEnvironmentValuesByEnvId(userId: string, envId: string): Promise<number> {
  const result = await kysely
    .deleteFrom('environmentValues')
    .where('environmentId', '=', uuid(envId))
    .where('userId', '=', uuid(userId))
    .returning('id')
    .execute();

  return result.length;
}
