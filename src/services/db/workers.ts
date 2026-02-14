import { kysely } from './kysely-client';
import { uuid, enumCast, base64Decode, byteaToText, enumToText } from './kysely-helpers';
import { sql } from 'kysely';
import type { IWorker, IWorkerLanguage } from '../../types';
import { sha256Hex } from '../../utils/crypto';
import { stringToBase64 } from '../../utils/base64';
import { isUuid } from '../../utils/validation';

interface WorkerRow {
  id: string;
  name: string | null;
  script: string;
  language: IWorkerLanguage;
  userId: string;
  environmentId?: string | null;
  currentVersion?: number | null;
  createdAt: Date;
  updatedAt: Date;
  environment?: IWorker['environment'];
  crons?: IWorker['crons'];
  domains?: IWorker['domains'];
}

// Union type: named worker OR anonymous worker with required projectId
export type CreateWorkerInput = {
  script: string;
  language: IWorkerLanguage;
  environmentId?: string;
} & ({ name: string; projectId?: string } | { name: null; projectId: string });

export async function findAllWorkers(userId: string): Promise<IWorker[]> {
  return kysely
    .selectFrom('workers as w')
    .leftJoin('workerDeployments as wd', (join) =>
      join
        .onRef('wd.workerId', '=', 'w.id')
        .onRef('wd.version', '=', 'w.currentVersion')
    )
    .select([
      'w.id',
      'w.name',
      'w.userId',
      'w.environmentId',
      'w.currentVersion',
      'w.createdAt',
      'w.updatedAt',
      enumToText<IWorkerLanguage>('wd.codeType').as('language'),
      byteaToText('wd.code').as('script'),
    ])
    .where('w.userId', '=', uuid(userId))
    .where('w.name', 'is not', null)
    .orderBy('w.createdAt', 'desc')
    .execute() as Promise<IWorker[]>;
}

export async function checkWorkerNameExists(name: string): Promise<boolean> {
  const worker = await kysely
    .selectFrom('workers')
    .select('id')
    .where('name', '=', name)
    .executeTakeFirst();

  return worker !== undefined;
}

interface FindWorkerOptions {
  includeScript?: boolean;
}

/**
 * Find a worker by id or name.
 * Always includes environment, crons, and domains.
 * Use includeScript: true to include the script code (expensive, avoid when not needed).
 */
export async function findWorker(
  userId: string,
  idOrName: string,
  options: FindWorkerOptions = {}
): Promise<WorkerRow | null> {
  const { includeScript = false } = options;

  const byId = isUuid(idOrName);

  let query = kysely
    .selectFrom('workers as w')
    .leftJoin('workerDeployments as wd', (join) =>
      join
        .onRef('wd.workerId', '=', 'w.id')
        .onRef('wd.version', '=', 'w.currentVersion')
    )
    .select([
      'w.id',
      'w.name',
      'w.userId',
      'w.environmentId',
      'w.currentVersion',
      'w.createdAt',
      'w.updatedAt',
      enumToText<IWorkerLanguage>('wd.codeType').as('language'),
      ...(includeScript ? [byteaToText('wd.code').as('script')] : []),
      sql<IWorker['environment']>`(
        SELECT json_build_object(
          'id', e.id,
          'name', e.name,
          'userId', e.user_id,
          'createdAt', e.created_at,
          'updatedAt', e.updated_at
        )
        FROM environments e
        WHERE e.id = w.environment_id
      )`.as('environment'),
      sql<IWorker['crons']>`(
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
      )`.as('crons'),
      sql<IWorker['domains']>`(
        SELECT coalesce(json_agg(json_build_object(
          'name', d.name,
          'workerId', d.worker_id,
          'userId', d.user_id,
          'createdAt', d.created_at,
          'updatedAt', d.updated_at
        )), '[]'::json)
        FROM domains d
        WHERE d.worker_id = w.id
      )`.as('domains'),
    ]);

  if (byId) {
    query = query.where('w.id', '=', uuid(idOrName));
  } else {
    query = query.where('w.name', '=', idOrName);
  }

  const worker = await query
    .where('w.userId', '=', uuid(userId))
    .executeTakeFirst();

  return worker ?? null;
}

// Convenience wrapper for internal use
export async function findWorkerById(userId: string, workerId: string): Promise<WorkerRow | null> {
  return findWorker(userId, workerId, { includeScript: true });
}

export async function createWorker(userId: string, input: CreateWorkerInput): Promise<IWorker> {
  // Create worker first
  const worker = await kysely
    .insertInto('workers')
    .values({
      name: input.name ?? null,
      userId: uuid(userId),
      environmentId: input.environmentId ? uuid(input.environmentId) : null,
      projectId: input.projectId ? uuid(input.projectId) : null,
      currentVersion: 1,
    })
    .returning(['id', 'name', 'userId', 'environmentId', 'createdAt', 'updatedAt'])
    .executeTakeFirstOrThrow();

  // Create initial deployment
  const hash = await sha256Hex(input.script);
  const codeBase64 = stringToBase64(input.script);

  await kysely
    .insertInto('workerDeployments')
    .values({
      workerId: uuid(worker.id),
      version: 1,
      hash,
      codeType: enumCast(input.language, 'enum_code_type'),
      code: base64Decode(codeBase64),
      deployedBy: uuid(userId),
      message: 'Initial deployment',
    })
    .execute();

  // Return worker with script and empty relations
  return {
    ...worker,
    name: worker.name!,
    currentVersion: 1,
    script: input.script,
    language: input.language,
    crons: [],
    domains: [],
  } as IWorker;
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
): Promise<WorkerRow | null> {
  const current = await findWorkerById(userId, workerId);

  if (!current) {
    return null;
  }

  const envId = updates.environmentId === undefined
    ? (current.environmentId ?? null)
    : updates.environmentId;

  // Update worker name/environment if provided
  await kysely
    .updateTable('workers')
    .set({
      name: updates.name ?? current.name,
      environmentId: envId ? uuid(envId) : null,
    })
    .where('id', '=', uuid(workerId))
    .where('userId', '=', uuid(userId))
    .execute();

  // Update script if provided
  if (updates.script !== undefined) {
    const hash = await sha256Hex(updates.script);
    const codeBase64 = stringToBase64(updates.script);

    // Get next version
    const result = await kysely
      .selectFrom('workerDeployments')
      .select(sql<number>`coalesce(max(version), 0) + 1`.as('nextVersion'))
      .where('workerId', '=', uuid(workerId))
      .executeTakeFirst();

    const nextVersion = result?.nextVersion ?? 1;

    const language = updates.language ?? current.language ?? 'javascript';

    await kysely
      .insertInto('workerDeployments')
      .values({
        workerId: uuid(workerId),
        version: nextVersion,
        hash,
        codeType: enumCast(language, 'enum_code_type'),
        code: base64Decode(codeBase64),
        deployedBy: uuid(userId),
        message: 'Update',
      })
      .execute();

    await kysely
      .updateTable('workers')
      .set({ currentVersion: nextVersion })
      .where('id', '=', uuid(workerId))
      .execute();
  }

  // Update domains if provided
  if (updates.domains !== undefined) {
    const { updateWorkerDomains } = await import('./domains');
    await updateWorkerDomains(userId, workerId, updates.domains);
  }

  return findWorkerById(userId, workerId);
}

export async function deleteWorker(userId: string, workerId: string): Promise<number> {
  const result = await kysely
    .deleteFrom('workers')
    .where('id', '=', uuid(workerId))
    .where('userId', '=', uuid(userId))
    .returning('id')
    .execute();

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
  const binding = await kysely
    .selectFrom('workers as w')
    .innerJoin('environmentValues as ev', 'ev.environmentId', 'w.environmentId')
    .innerJoin('storageConfigs as sc', (join) => join.on(sql`sc.id = ev.value::uuid`))
    .select([
      'sc.id as storageConfigId',
      'sc.bucket',
      'sc.prefix',
      'sc.accessKeyId',
      'sc.secretAccessKey',
      'sc.endpoint',
      'sc.region',
    ])
    .where('w.id', '=', uuid(workerId))
    .where('w.userId', '=', uuid(userId))
    .where(sql<boolean>`ev.type = 'assets'`)
    .executeTakeFirst();

  return binding ?? null;
}
