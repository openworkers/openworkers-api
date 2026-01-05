import { Hono } from 'hono';
import pLimit from 'p-limit';
import { workersService } from '../services/workers';
import { cronsService } from '../services/crons';
import { checkWorkerNameExists, findWorkerAssetsBinding } from '../services/db/workers';
import { WorkerCreateInputSchema, WorkerUpdateInputSchema, WorkerSchema } from '../types';
import { jsonResponse, jsonArrayResponse } from '../utils/validate';
import { S3Client } from '../utils/s3';
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
    return jsonArrayResponse(c, WorkerSchema.omit({ script: true }), workers);
  } catch (error) {
    console.error('Failed to fetch workers:', error);
    return c.json({ error: 'Failed to fetch workers' }, 500);
  }
});

// GET /workers/:id - Get single worker
workers.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  try {
    const worker = await workersService.findById(userId, id);

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
  const body = await c.req.json();

  try {
    const payload = WorkerCreateInputSchema.parse(body);
    const defaultScript = payload.language === 'typescript' ? defaultWorkerTs : defaultWorkerJs;

    const worker = await workersService.create(userId, {
      name: payload.name,
      script: payload.script || defaultScript,
      language: payload.language,
      environmentId: undefined // TODO: Handle environment mapping if needed
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

// PATCH /workers/:id - Update worker
workers.patch('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = await c.req.json();

  try {
    const payload = WorkerUpdateInputSchema.parse(body);

    const updatedWorker = await workersService.update(userId, id, payload);

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

// POST /workers/:id/crons - Create cron for worker
workers.post('/:id/crons', async (c) => {
  const userId = c.get('userId');
  const workerId = c.req.param('id');
  const body = await c.req.json();

  if (!body.expression) {
    return c.json({ error: 'Missing required field: expression' }, 400);
  }

  try {
    // Verify worker exists and belongs to user
    const worker = await workersService.findById(userId, workerId);
    if (!worker) {
      return c.json({ error: 'Worker not found' }, 404);
    }

    await cronsService.create(userId, {
      workerId,
      value: body.expression // Map expression -> value
    });

    // Return updated worker
    const updatedWorker = await workersService.findById(userId, workerId);
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

// DELETE /workers/:id - Delete worker
workers.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  try {
    const deleted = await workersService.delete(userId, id);

    if (deleted === 0) {
      return c.json({ error: 'Worker not found' }, 404);
    }

    return c.json({ deleted });
  } catch (error) {
    console.error('Failed to delete worker:', error);
    return c.json({ error: 'Failed to delete worker' }, 500);
  }
});

// POST /workers/:id/upload - Upload zip with _worker.js and assets
workers.post('/:id/upload', async (c) => {
  const userId = c.get('userId');
  const workerId = c.req.param('id');

  try {
    // 1. Check worker exists
    const worker = await workersService.findById(userId, workerId);

    if (!worker) {
      return c.json({ error: 'Worker not found' }, 404);
    }

    // 2. Check worker has ASSETS binding
    const assetsBinding = await findWorkerAssetsBinding(userId, workerId);

    if (!assetsBinding) {
      return c.json(
        { error: 'Worker has no ASSETS binding. Add an assets binding to the worker environment first.' },
        400
      );
    }

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

    // 4. Extract zip
    const zipBuffer = await file.arrayBuffer();
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(zipBuffer);

    // 5. Find _worker.js or _worker.ts (at root or in first directory)
    let workerScript: string | null = null;
    let workerLanguage: 'javascript' | 'typescript' = 'javascript';
    const assets: { path: string; content: Uint8Array }[] = [];

    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue;

      // Normalize path (remove leading directory if present)
      const normalizedPath = relativePath.replace(/^[^/]+\//, '');
      const filename = normalizedPath || relativePath;

      if (filename === '_worker.js' || filename === '_worker.ts') {
        workerScript = await zipEntry.async('string');
        workerLanguage = filename.endsWith('.ts') ? 'typescript' : 'javascript';
      } else if (normalizedPath.startsWith('assets/') || relativePath.startsWith('assets/')) {
        const assetPath = normalizedPath.startsWith('assets/')
          ? normalizedPath.slice('assets/'.length)
          : relativePath.slice('assets/'.length);

        if (assetPath) {
          const content = await zipEntry.async('uint8array');
          assets.push({ path: assetPath, content });
        }
      }
    }

    if (!workerScript) {
      return c.json({ error: 'No _worker.js or _worker.ts found in zip archive' }, 400);
    }

    // 6. Update worker script
    await workersService.update(userId, workerId, { script: workerScript, language: workerLanguage });

    // 7. Upload assets to S3
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

    // Upload assets in parallel (10 concurrent)
    const limit = pLimit(10);

    const results = await Promise.all(
      assets.map((asset) =>
        limit(async () => {
          const success = await s3Client.put(asset.path, asset.content, getMimeType(asset.path));

          if (!success) {
            console.error(`Failed to upload ${asset.path}`);
          }

          return success;
        })
      )
    );

    const uploadedCount = results.filter(Boolean).length;

    // 8. Return success with worker URL
    const workerDomain = worker.domains?.[0]?.name;
    const workerUrl = workerDomain ? `https://${workerDomain}` : `https://${worker.name}.workers.rocks`;

    return c.json({
      success: true,
      worker: {
        id: worker.id,
        name: worker.name,
        url: workerUrl
      },
      uploaded: {
        script: true,
        assets: uploadedCount
      }
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

/**
 * Get MIME type from file extension
 */
function getMimeType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    mjs: 'application/javascript',
    json: 'application/json',
    xml: 'application/xml',
    txt: 'text/plain',
    md: 'text/markdown',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    webp: 'image/webp',
    avif: 'image/avif',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    otf: 'font/otf',
    eot: 'application/vnd.ms-fontobject',
    pdf: 'application/pdf',
    zip: 'application/zip',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    webm: 'video/webm',
    wasm: 'application/wasm'
  };

  return mimeTypes[ext ?? ''] ?? 'application/octet-stream';
}

export default workers;
