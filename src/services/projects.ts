import { strFromU8 } from 'fflate';
import { sql } from './db/client';
import { workersService } from './workers';

/**
 * Create storage routes for a project
 */
export async function createStorageRoutes(projectId: string, patterns: string[], priority: number): Promise<void> {
  for (const pattern of patterns) {
    await sql(
      `INSERT INTO project_routes (project_id, pattern, priority, backend_type)
       VALUES ($1::uuid, $2, $3, 'storage'::enum_backend_type)
       ON CONFLICT (project_id, pattern) DO UPDATE
       SET priority = $3, backend_type = 'storage'::enum_backend_type`,
      [projectId, pattern, priority]
    );
  }
}

/**
 * Create function routes (isolated workers) for a project
 * Functions use wildcard patterns (* and **) for dynamic routing
 * Each function is a separate worker without a name
 */
export async function createFunctionRoutes(
  userId: string,
  projectId: string,
  functions: Array<{ pattern: string; worker: string }>,
  unzippedFiles: Record<string, Uint8Array>
): Promise<void> {
  // Function routes have high priority (10) - after storage but before SSR
  const priority = 10;

  // Get project's environment_id (required for all project workers)
  const projectRows = await sql<{ environment_id?: string }>(
    'SELECT environment_id FROM projects WHERE id = $1::uuid',
    [projectId]
  );
  const projectEnvironmentId = projectRows[0]?.environment_id;

  for (const func of functions) {
    try {
      // Find and read function worker script from unzipped files
      const fileData = unzippedFiles[func.worker];

      if (!fileData) {
        console.error(`Function file not found in zip: ${func.worker}`);
        continue;
      }

      const script = strFromU8(fileData);

      // Create a new worker (without name) for this function using service
      const newWorker = await workersService.create(userId, {
        name: null,
        script,
        language: 'javascript',
        projectId,
        environmentId: projectEnvironmentId
      });

      if (!newWorker) {
        console.error(`Failed to create worker for function: ${func.worker}`);
        continue;
      }

      // Create route pointing to this function worker
      await sql(
        `INSERT INTO project_routes (project_id, pattern, priority, backend_type, worker_id)
         VALUES ($1::uuid, $2, $3, 'worker'::enum_backend_type, $4::uuid)
         ON CONFLICT (project_id, pattern) DO UPDATE
         SET priority = $3, backend_type = 'worker'::enum_backend_type, worker_id = $4::uuid`,
        [projectId, func.pattern, priority, newWorker.id]
      );
    } catch (error) {
      console.error(`Failed to process function ${func.worker}:`, error);
      // Continue with other functions
    }
  }
}
