import { sql } from './client';
import type { IWorker, IWorkerLanguage } from '../../types';
import { createHash } from 'crypto';

interface WorkerRow {
  id: string;
  name: string;
  script: string;
  language: IWorkerLanguage;
  userId: string;
  environmentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  environment?: IWorker['environment'];
  crons?: IWorker['crons'];
  domains?: IWorker['domains'];
}

export async function findAllWorkers(userId: string): Promise<IWorker[]> {
  return sql<WorkerRow>(
    `SELECT
      w.id,
      w.name,
      w.user_id as "userId",
      w.environment_id as "environmentId",
      w.created_at as "createdAt",
      w.updated_at as "updatedAt",
      wd.code_type::text as "language",
      convert_from(wd.code, 'UTF8') as script
    FROM workers w
    LEFT JOIN worker_deployments wd ON wd.worker_id = w.id AND wd.version = w.current_version
    WHERE w.user_id = $1::uuid
    ORDER BY w.created_at DESC`,
    [userId]
  );
}

export async function checkWorkerNameExists(name: string): Promise<boolean> {
  const workers = await sql<{ id: string }>(
    `SELECT id
    FROM workers
    WHERE name = $1
    LIMIT 1`,
    [name]
  );
  return workers.length > 0;
}

export async function findWorkerById(userId: string, workerId: string): Promise<IWorker | null> {
  const workers = await sql<WorkerRow>(
    `SELECT
      w.id,
      w.name,
      w.user_id as "userId",
      w.created_at as "createdAt",
      w.updated_at as "updatedAt",
      wd.code_type::text as "language",
      convert_from(wd.code, 'UTF8') as script,
      (
        SELECT json_build_object(
          'id', e.id,
          'name', e.name,
          'userId', e.user_id,
          'createdAt', e.created_at,
          'updatedAt', e.updated_at
        )
        FROM environments e
        WHERE e.id = w.environment_id
      ) as environment,
      (
        SELECT coalesce(json_agg(json_build_object(
          'id', c.id,
          'value', c.value,
          'workerId', c.worker_id,
          'nextRun', c.next_run,
          'lastRun', c.last_run,
          'createdAt', c.created_at,
          'updatedAt', c.updated_at
        )), '[]'::json)
        FROM crons c
        WHERE c.worker_id = w.id
      ) as crons,
      (
        SELECT coalesce(json_agg(json_build_object(
          'name', d.name,
          'workerId', d.worker_id,
          'userId', d.user_id,
          'createdAt', d.created_at,
          'updatedAt', d.updated_at
        )), '[]'::json)
        FROM domains d
        WHERE d.worker_id = w.id
      ) as domains
    FROM workers w
    LEFT JOIN worker_deployments wd ON wd.worker_id = w.id AND wd.version = w.current_version
    WHERE w.id = $1::uuid AND w.user_id = $2::uuid`,
    [workerId, userId]
  );
  return workers[0] ?? null;
}

export async function createWorker(
  userId: string,
  name: string,
  script: string,
  language: IWorkerLanguage,
  environmentId?: string
): Promise<IWorker> {
  // Create worker first
  const workers = await sql<WorkerRow>(
    `INSERT INTO workers (name, user_id, environment_id, current_version)
    VALUES ($1, $2::uuid, $3::uuid, 1)
    RETURNING
      id,
      name,
      user_id as "userId",
      environment_id as "environmentId",
      created_at as "createdAt",
      updated_at as "updatedAt"`,
    [name, userId, environmentId ?? null]
  );

  const worker = workers[0]!;

  // Create initial deployment
  const hash = createHash('sha256').update(script).digest('hex');
  const codeBytes = Buffer.from(script, 'utf-8');
  const codeBase64 = codeBytes.toString('base64');

  await sql(
    `INSERT INTO worker_deployments (worker_id, version, hash, code_type, code, deployed_by, message)
    VALUES ($1::uuid, 1, $2, $3::enum_code_type, decode($4, 'base64'), $5::uuid, $6)`,
    [worker.id, hash, language, codeBase64, userId, 'Initial deployment']
  );

  // Return full worker
  return (await findWorkerById(userId, worker.id))!;
}

export async function updateWorker(
  userId: string,
  workerId: string,
  updates: {
    name?: string;
    script?: string;
    language?: IWorkerLanguage;
    environmentId?: string | null;
    domains?: string[];
  }
): Promise<IWorker | null> {
  const current = await findWorkerById(userId, workerId);

  if (!current) {
    return null;
  }

  // Update worker name/environment if provided
  await sql(
    `UPDATE workers
    SET
      name = $1,
      environment_id = $2::uuid
    WHERE id = $3::uuid AND user_id = $4::uuid`,
    [
      updates.name ?? current.name,
      updates.environmentId === undefined ? (current.environment?.id ?? null) : updates.environmentId,
      workerId,
      userId
    ]
  );

  // Update script if provided
  if (updates.script !== undefined && updates.script !== current.script) {
    const hash = createHash('sha256').update(updates.script).digest('hex');
    const codeBytes = Buffer.from(updates.script, 'utf-8');
    const codeBase64 = codeBytes.toString('base64');

    // Get next version
    const versionResult = await sql<{ nextVersion: number }>(
      `SELECT coalesce(max(version), 0) + 1 as "nextVersion"
      FROM worker_deployments
      WHERE worker_id = $1::uuid`,
      [workerId]
    );
    const nextVersion = versionResult[0]?.nextVersion ?? 1;

    const language = updates.language ?? current.language ?? 'javascript';

    await sql(
      `INSERT INTO worker_deployments (worker_id, version, hash, code_type, code, deployed_by, message)
      VALUES ($1::uuid, $2, $3, $4::enum_code_type, decode($5, 'base64'), $6::uuid, 'Update')`,
      [workerId, nextVersion, hash, language, codeBase64, userId]
    );

    await sql(`UPDATE workers SET current_version = $1 WHERE id = $2::uuid`, [nextVersion, workerId]);
  }

  // Update domains if provided
  if (updates.domains !== undefined) {
    const { updateWorkerDomains } = await import('./domains');
    await updateWorkerDomains(userId, workerId, updates.domains);
  }

  return findWorkerById(userId, workerId);
}

export async function deleteWorker(userId: string, workerId: string): Promise<number> {
  const result = await sql<{ id: string }>(
    `DELETE FROM workers
    WHERE id = $1::uuid AND user_id = $2::uuid
    RETURNING id`,
    [workerId, userId]
  );
  return result.length;
}

// Assets binding (unchanged)

export interface WorkerAssetsBinding {
  storageConfigId: string;
  bucket: string;
  prefix: string | null;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string | null;
  region: string | null;
}

/**
 * Get worker's ASSETS binding with storage config credentials.
 * Returns null if worker has no ASSETS binding.
 */
export async function findWorkerAssetsBinding(userId: string, workerId: string): Promise<WorkerAssetsBinding | null> {
  const rows = await sql<WorkerAssetsBinding>(
    `SELECT
      sc.id as "storageConfigId",
      sc.bucket,
      sc.prefix,
      sc.access_key_id as "accessKeyId",
      sc.secret_access_key as "secretAccessKey",
      sc.endpoint,
      sc.region
    FROM workers w
    JOIN environment_values ev ON ev.environment_id = w.environment_id
    JOIN storage_configs sc ON sc.id = ev.value::uuid
    WHERE w.id = $1::uuid
      AND w.user_id = $2::uuid
      AND ev.type = 'assets'
    LIMIT 1`,
    [workerId, userId]
  );

  return rows[0] ?? null;
}
