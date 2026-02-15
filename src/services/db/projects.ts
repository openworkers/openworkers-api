import { kysely } from './kysely-client';
import { uuid, uuidOrNull, enumCast } from './kysely-helpers';

/**
 * Check if a worker is a project's main worker
 */
export async function isProjectMainWorker(userId: string, workerId: string): Promise<boolean> {
  const project = await kysely
    .selectFrom('projects')
    .select('id')
    .where('id', '=', uuid(workerId))
    .where('userId', '=', uuid(userId))
    .executeTakeFirst();

  return project !== undefined;
}

/**
 * Delete a project by ID
 * Returns the number of deleted projects
 */
export async function deleteProject(userId: string, projectId: string): Promise<number> {
  const result = await kysely
    .deleteFrom('projects')
    .where('id', '=', uuid(projectId))
    .where('userId', '=', uuid(userId))
    .returning('id')
    .execute();

  return result.length;
}

/**
 * Get project's environment ID
 */
export async function getProjectEnvironmentId(projectId: string): Promise<string | null> {
  const project = await kysely
    .selectFrom('projects')
    .select('environmentId')
    .where('id', '=', uuid(projectId))
    .executeTakeFirst();

  return project?.environmentId ?? null;
}

/**
 * Create or update storage routes for a project
 */
export async function upsertStorageRoutes(projectId: string, patterns: string[], priority: number): Promise<void> {
  for (const pattern of patterns) {
    await kysely
      .insertInto('projectRoutes')
      .values({
        projectId: uuid(projectId),
        pattern,
        priority,
        backendType: enumCast('storage', 'enum_backend_type'),
        workerId: null
      })
      .onConflict((oc) =>
        oc.columns(['projectId', 'pattern']).doUpdateSet({
          priority,
          backendType: enumCast('storage', 'enum_backend_type')
        })
      )
      .execute();
  }
}

/**
 * Create or update a function route for a project
 */
export async function upsertFunctionRoute(
  projectId: string,
  pattern: string,
  workerId: string,
  priority: number
): Promise<void> {
  await kysely
    .insertInto('projectRoutes')
    .values({
      projectId: uuid(projectId),
      pattern,
      priority,
      backendType: enumCast('worker', 'enum_backend_type'),
      workerId: uuid(workerId)
    })
    .onConflict((oc) =>
      oc.columns(['projectId', 'pattern']).doUpdateSet({
        priority,
        backendType: enumCast('worker', 'enum_backend_type'),
        workerId: uuid(workerId)
      })
    )
    .execute();
}
