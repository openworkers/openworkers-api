import { Hono } from 'hono';
import { unzipSync, strFromU8 } from 'fflate';
import { workersService } from '../services/workers';
import { cronsService } from '../services/crons';
import { checkWorkerNameExists, findWorkerAssetsBinding } from '../services/db/workers';
import { sql } from '../services/db/client';
import { WorkerCreateInputSchema, WorkerUpdateInputSchema, WorkerSchema } from '../types';
import { jsonResponse, jsonArrayResponse, parseAndValidate } from '../utils/validate';
import { S3Client } from '../utils/s3';
import { stringToBase64, bytesToString, base64Encode } from '../utils/base64';
import { hexDecode } from '../utils/hex';
import { sha256HexUint8 } from '../utils/crypto';
import { sharedStorage } from '../config';
import defaultWorkerJs from '../../examples/default-worker-js.txt';
import defaultWorkerTs from '../../examples/default-worker-ts.txt';

const workers = new Hono();

// GET /workers/name-exists/:name - Check if worker name exists (globally unique)
workers.get('/name-exists/:name', async (c) => {
  const name = c.req.param('name');

  try {
    const exists = await checkWorkerNameExists(name);
    return c.json({ exists });
  } catch (error) {
    console.error('Failed to check worker name:', error);
    return c.json({ error: 'Failed to check worker name' }, 500);
  }
});

// GET /workers - List all workers for current user
workers.get('/', async (c) => {
  const userId = c.get('userId');

  try {
    const workers = await workersService.findAll(userId);
    return jsonArrayResponse(c, WorkerSchema, workers);
  } catch (error) {
    console.error('Failed to fetch workers:', error);
    return c.json({ error: 'Failed to fetch workers' }, 500);
  }
});

// GET /workers/:id - Get single worker (accepts UUID or name)
// Use ?script=true to include the script in the response
workers.get('/:id', async (c) => {
  const userId = c.get('userId');
  const idOrName = c.req.param('id');
  const includeScript = c.req.query('script') === 'true';

  try {
    const worker = await workersService.findByIdOrName(userId, idOrName, { includeScript });

    if (!worker) {
      return c.json({ error: 'Worker not found' }, 404);
    }

    return jsonResponse(c, WorkerSchema, worker);
  } catch (error) {
    console.error('Failed to fetch worker:', error);
    return c.json({ error: 'Failed to fetch worker' }, 500);
  }
});

// POST /workers - Create new worker
workers.post('/', async (c) => {
  const userId = c.get('userId');
  const payload = await parseAndValidate(c, WorkerCreateInputSchema);

  try {
    const defaultScript = payload.language === 'typescript' ? defaultWorkerTs : defaultWorkerJs;
    const script = payload.script ?? defaultScript;

    const worker = await workersService.create(userId, {
      name: payload.name,
      script,
      language: payload.language
    });

    return jsonResponse(c, WorkerSchema, worker, 201);
  } catch (error) {
    console.error('Failed to create worker:', error);
    return c.json(
      {
        error: 'Failed to create worker',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

// PATCH /workers/:id - Update worker (accepts UUID or name)
workers.patch('/:id', async (c) => {
  const userId = c.get('userId');
  const idOrName = c.req.param('id');
  const payload = await parseAndValidate(c, WorkerUpdateInputSchema);

  try {
    const worker = await workersService.findByIdOrName(userId, idOrName);

    if (!worker) {
      return c.json({ error: 'Worker not found' }, 404);
    }

    const updatedWorker = await workersService.update(userId, worker.id, payload);

    if (!updatedWorker) {
      return c.json({ error: 'Worker not found' }, 404);
    }

    return jsonResponse(c, WorkerSchema, updatedWorker);
  } catch (error) {
    console.error('Failed to update worker:', error);
    return c.json(
      {
        error: 'Failed to update worker',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

// POST /workers/:id/crons - Create cron for worker (accepts UUID or name)
workers.post('/:id/crons', async (c) => {
  const userId = c.get('userId');
  const idOrName = c.req.param('id');
  const body = await c.req.json();

  if (!body.expression) {
    return c.json({ error: 'Missing required field: expression' }, 400);
  }

  try {
    // Verify worker exists and belongs to user
    const worker = await workersService.findByIdOrName(userId, idOrName);

    if (!worker) {
      return c.json({ error: 'Worker not found' }, 404);
    }

    await cronsService.create(userId, {
      workerId: worker.id,
      value: body.expression // Map expression -> value
    });

    // Return updated worker with crons
    const updatedWorker = await workersService.findById(userId, worker.id, {});
    return jsonResponse(c, WorkerSchema, updatedWorker, 201);
  } catch (error) {
    console.error('Failed to create cron:', error);
    return c.json(
      {
        error: 'Failed to create cron',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

// DELETE /workers/:id - Delete worker (accepts UUID or name)
workers.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const idOrName = c.req.param('id');

  try {
    const worker = await workersService.findByIdOrName(userId, idOrName);

    if (!worker) {
      return c.json({ error: 'Worker not found' }, 404);
    }

    // TEMPORARY WORKAROUND: Check if this is a main worker (project)
    // Since the UI doesn't distinguish between projects and standalone workers yet,
    // we detect if this worker is a main worker and delete the project instead.
    // This avoids the "Cannot delete main worker" constraint error.
    // TODO: Remove this when UI properly distinguishes projects from workers.
    const projectCheck = await sql('SELECT id FROM projects WHERE id = $1::uuid AND user_id = $2::uuid', [
      worker.id,
      userId
    ]);

    let deleted: number;

    if (projectCheck.length > 0) {
      // This is a main worker - delete the project instead (cascades to all workers)
      const deleteResult = await sql('DELETE FROM projects WHERE id = $1::uuid AND user_id = $2::uuid RETURNING id', [
        worker.id,
        userId
      ]);
      deleted = deleteResult.length;
    } else {
      // Regular worker - delete normally
      deleted = await workersService.delete(userId, worker.id);
    }

    if (deleted === 0) {
      return c.json({ error: 'Worker not found' }, 404);
    }

    return c.json({ deleted });
  } catch (error) {
    console.error('Failed to delete worker:', error);
    return c.json({ error: 'Failed to delete worker' }, 500);
  }
});

// POST /workers/:id/deploy - Deploy code to worker (CLI-friendly)
// Accepts either worker ID (UUID) or name
workers.post('/:id/deploy', async (c) => {
  const userId = c.get('userId');
  const idOrName = c.req.param('id');
  const body = await c.req.json();

  try {
    // Validate input
    if (!body.code) {
      return c.json({ error: 'Missing required field: code' }, 400);
    }

    if (!body.codeType) {
      return c.json({ error: 'Missing required field: codeType' }, 400);
    }

    const worker = await workersService.findByIdOrName(userId, idOrName);

    if (!worker) {
      return c.json({ error: 'Worker not found' }, 404);
    }

    const workerId = worker.id;

    // Decode base64 code if it's bytes
    const script = Array.isArray(body.code) ? bytesToString(body.code) : body.code;

    // Map code_type to language
    const language = body.codeType === 'javascript' ? 'javascript' : 'typescript';

    // Update worker with new script
    const updatedWorker = await workersService.update(userId, workerId, {
      script,
      language
    });

    if (!updatedWorker) {
      return c.json({ error: 'Worker not found' }, 404);
    }

    // Return deployment info
    return c.json({
      workerId: updatedWorker.id,
      version: updatedWorker.currentVersion,
      hash: stringToBase64(script).slice(0, 16),
      codeType: body.codeType,
      deployedAt: new Date().toISOString(),
      message: body.message || null
    });
  } catch (error) {
    console.error('Failed to deploy worker:', error);
    return c.json(
      {
        error: 'Failed to deploy worker',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

// POST /workers/:id/upload - Upload zip with _worker.js and assets
// Supports _routes.json for custom routing rules (storage vs worker backends)
// TODO: Support /functions folder (filesystem routing like Cloudflare Pages Functions)
workers.post('/:id/upload', async (c) => {
  const userId = c.get('userId');
  const idOrName = c.req.param('id');

  console.log('Received upload request for worker:', idOrName);

  try {
    // 1. Check worker exists (accepts UUID or name)
    const worker = await workersService.findByIdOrName(userId, idOrName);

    if (!worker) {
      return c.json({ error: 'Worker not found' }, 404);
    }

    // 2. Check worker has ASSETS binding
    const assetsBinding = await findWorkerAssetsBinding(userId, worker.id);

    if (!assetsBinding) {
      return c.json(
        { error: 'Worker has no ASSETS binding. Add an assets binding to the worker environment first.' },
        400
      );
    }

    console.log('Found ASSETS binding for worker:', assetsBinding);

    // 3. Parse multipart form data
    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'Missing file in form data' }, 400);
    }

    if (!file.name.endsWith('.zip')) {
      return c.json({ error: 'File must be a .zip archive' }, 400);
    }

    // 50MB limit
    if (file.size > 50 * 1024 * 1024) {
      return c.json({ error: 'File too large. Maximum size is 50MB.' }, 413);
    }

    // 3b. Parse asset manifest from form data (sent separately from zip)
    const assetsManifest = formData.get('assets');
    const assetEntries: Array<{ path: string; size: number; contentType: string; hash: string }> = assetsManifest
      ? JSON.parse(assetsManifest as string)
      : [];

    // 4. Extract zip (code-only: worker script, routes, functions)
    const zipBuffer = await file.arrayBuffer();
    const unzipped = unzipSync(new Uint8Array(zipBuffer));

    // 5. Process extracted files
    let workerScript: Uint8Array | null = null;
    let language: 'javascript' | 'typescript' = 'javascript';
    let routesJson: string | null = null;
    const functionScripts = new Map<string, string>();

    let fileCount = 0;

    for (const [relativePath, fileData] of Object.entries(unzipped)) {
      const normalizedPath = relativePath.replace(/^[^/]+\//, '');
      const filename = normalizedPath || relativePath;

      if (
        filename === 'worker.js' ||
        filename === 'worker.ts' ||
        filename === '_worker.js' ||
        filename === '_worker.ts'
      ) {
        language = filename.endsWith('.ts') ? 'typescript' : 'javascript';
        workerScript = fileData;
        fileCount++;
      } else if (filename === '_routes.json') {
        routesJson = strFromU8(fileData);
        fileCount++;
      } else if (relativePath.includes('functions/')) {
        const funcIdx = relativePath.indexOf('functions/');
        const funcPath = relativePath.slice(funcIdx);
        functionScripts.set(funcPath, strFromU8(fileData));
        fileCount++;
      }
    }

    console.log(`Extracted ${fileCount} files from zip...`);

    console.log(
      `Extracted: worker=${!!workerScript}, routes=${!!routesJson}, functions=${functionScripts.size}, assets=${assetEntries.length} (manifest)`
    );

    if (!workerScript) {
      return c.json({ error: 'No worker.js or worker.ts found in zip archive' }, 400);
    }

    // 6. Compute script hash
    const hash = await sha256HexUint8(workerScript);
    const scriptBase64 = base64Encode(workerScript);

    // 7. Generate presigned URLs for asset uploads (if manifest provided)
    let presignedAssets: Array<{ path: string; headUrl: string; putUrl: string }> = [];

    if (assetEntries.length > 0) {
      const endpoint = assetsBinding.endpoint ?? sharedStorage.endpoint;

      if (!endpoint) {
        return c.json({ error: 'Storage endpoint not configured' }, 500);
      }

      const s3Client = new S3Client({
        bucket: assetsBinding.bucket,
        endpoint,
        accessKeyId: assetsBinding.accessKeyId,
        secretAccessKey: assetsBinding.secretAccessKey,
        region: assetsBinding.region,
        prefix: assetsBinding.prefix
      });

      presignedAssets = await Promise.all(
        assetEntries.map(async (asset) => {
          // Convert hex hash to base64 for S3
          const checksumBase64 = base64Encode(hexDecode(asset.hash));

          return {
            path: asset.path,
            headUrl: await s3Client.presignHead(asset.path),
            putUrl: await s3Client.presignPut(asset.path, {
              contentType: asset.contentType,
              contentLength: asset.size,
              checksumBase64
            })
          };
        })
      );
    }

    // 8. Build route parameters from _routes.json
    const storageRoutes: Array<{ pattern: string; priority: number }> = [];
    const functionWorkers: Array<{ pattern: string; script: string }> = [];

    if (routesJson) {
      try {
        const routes = JSON.parse(routesJson);

        if (routes.immutable && Array.isArray(routes.immutable)) {
          for (const p of routes.immutable) storageRoutes.push({ pattern: p, priority: 3 });
        }

        if (routes.static && Array.isArray(routes.static)) {
          for (const p of routes.static) storageRoutes.push({ pattern: p, priority: 2 });
        }

        if (routes.prerendered && Array.isArray(routes.prerendered)) {
          for (const p of routes.prerendered) storageRoutes.push({ pattern: p, priority: 1 });
        }

        if (routes.functions && Array.isArray(routes.functions)) {
          for (const func of routes.functions) {
            const script = functionScripts.get(func.worker);

            if (!script) {
              console.error(`Function script not found in zip: ${func.worker}`);
              continue;
            }

            functionWorkers.push({ pattern: func.pattern, script });
          }
        }
      } catch (error) {
        console.error('Failed to parse routes.json:', error);
      }
    }

    // 9. Deploy in one DB call (script + project + routes + function workers)
    const deployResult = await sql<{
      out_project_id: string;
      out_next_version: number;
      functions_created: number;
    }>(
      `SELECT * FROM deploy_project(
        $1::uuid, $2::uuid, decode($3, 'base64'), $4, $5::enum_code_type,
        $6::jsonb, $7::jsonb
      )`,
      [worker.id, userId, scriptBase64, hash, language, JSON.stringify(storageRoutes), JSON.stringify(functionWorkers)]
    );

    console.log('Deployed:', deployResult[0]);

    // 10. Get updated worker
    const updatedWorker = await workersService.findById(userId, worker.id, {});

    // 11. Return success with worker URL (custom domain if available, otherwise just name)
    const workerDomain = updatedWorker?.domains?.[0]?.name;
    const workerUrl = workerDomain ? `https://${workerDomain}` : worker.name;

    return c.json({
      success: true,
      worker: {
        id: worker.id,
        name: worker.name,
        url: workerUrl
      },
      deployed: deployResult[0]
        ? {
            version: deployResult[0].out_next_version,
            functions: deployResult[0].functions_created
          }
        : undefined,
      assets: presignedAssets.length > 0 ? presignedAssets : undefined
    });
  } catch (error) {
    console.error('Failed to upload worker:', error);
    return c.json(
      {
        error: 'Failed to upload worker',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

export default workers;
