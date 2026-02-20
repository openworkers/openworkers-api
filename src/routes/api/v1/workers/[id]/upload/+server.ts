import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { unzipSync, strFromU8 } from 'fflate';
import { workersService } from '$lib/services/workers';
import { findWorkerAssetsBinding } from '$lib/services/db/workers';
import { sql } from '$lib/services/db/client';
import { S3Client } from '$lib/utils/s3';
import { base64Encode } from '$lib/utils/base64';
import { hexDecode } from '$lib/utils/hex';
import { sha256HexUint8 } from '$lib/utils/crypto';
import { getStorageConfig } from '$lib/config';

// POST /api/v1/workers/:id/upload - Upload zip with _worker.js and assets
export const POST: RequestHandler = async ({ locals, params, request }) => {
  const userId = locals.userId;
  const idOrName = params.id;

  console.log('Received upload request for worker:', idOrName);

  try {
    const worker = await workersService.findByIdOrName(userId, idOrName);

    if (!worker) {
      return json({ error: 'Worker not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return json({ error: 'Missing file in form data' }, { status: 400 });
    }

    if (!file.name.endsWith('.zip')) {
      return json({ error: 'File must be a .zip archive' }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return json({ error: 'File too large. Maximum size is 50MB.' }, { status: 413 });
    }

    const assetsManifest = formData.get('assets');
    const assetEntries: Array<{ path: string; size: number; contentType: string; hash: string }> = assetsManifest
      ? JSON.parse(assetsManifest as string)
      : [];

    // Check ASSETS binding (only needed when uploading static assets)
    let assetsBinding: Awaited<ReturnType<typeof findWorkerAssetsBinding>> = null;

    if (assetEntries.length > 0) {
      assetsBinding = await findWorkerAssetsBinding(userId, worker.id);

      if (!assetsBinding) {
        return json(
          { error: 'Worker has no ASSETS binding. Add an assets binding to the worker environment first.' },
          { status: 400 }
        );
      }
    }

    const zipBuffer = await file.arrayBuffer();
    const unzipped = unzipSync(new Uint8Array(zipBuffer));

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
      return json({ error: 'No worker.js or worker.ts found in zip archive' }, { status: 400 });
    }

    const hash = await sha256HexUint8(workerScript.buffer as ArrayBuffer);
    const scriptBase64 = base64Encode(workerScript);

    let presignedAssets: Array<{ path: string; headUrl: string; putUrl: string }> = [];

    if (assetEntries.length > 0 && assetsBinding) {
      const endpoint = assetsBinding.endpoint ?? getStorageConfig().endpoint;

      if (!endpoint) {
        return json({ error: 'Storage endpoint not configured' }, { status: 500 });
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

    const updatedWorker = await workersService.findById(userId, worker.id, {});

    const workerDomain = updatedWorker?.domains?.[0]?.name;
    const workerUrl = workerDomain ? `https://${workerDomain}` : worker.name;

    return json({
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
    return json(
      { error: 'Failed to upload worker', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
