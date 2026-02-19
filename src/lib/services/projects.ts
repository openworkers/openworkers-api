import { strFromU8 } from 'fflate';
import { workersService } from './workers';
import * as db from './db/projects';

/**
 * Create storage routes for a project
 */
export async function createStorageRoutes(projectId: string, patterns: string[], priority: number): Promise<void> {
  await db.upsertStorageRoutes(projectId, patterns, priority);
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
  const projectEnvironmentId = await db.getProjectEnvironmentId(projectId);

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
        environmentId: projectEnvironmentId ?? undefined
      });

      if (!newWorker) {
        console.error(`Failed to create worker for function: ${func.worker}`);
        continue;
      }

      // Create route pointing to this function worker
      await db.upsertFunctionRoute(projectId, func.pattern, newWorker.id, priority);
    } catch (error) {
      console.error(`Failed to process function ${func.worker}:`, error);
      // Continue with other functions
    }
  }
}
