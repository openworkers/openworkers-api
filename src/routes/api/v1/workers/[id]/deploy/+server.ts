import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { workersService } from '$lib/services/workers';
import { base64Encode, bytesToString, stringToBase64 } from '$lib/utils/base64';

// POST /api/v1/workers/:id/deploy - Deploy code to worker
export const POST: RequestHandler = async ({ locals, params, request }) => {
  const userId = locals.userId;
  const idOrName = params.id;
  const body = await request.json();

  try {
    if (!body.code) {
      return json({ error: 'Missing required field: code' }, { status: 400 });
    }

    if (!body.codeType) {
      return json({ error: 'Missing required field: codeType' }, { status: 400 });
    }

    const worker = await workersService.findByIdOrName(userId, idOrName);

    if (!worker) {
      return json({ error: 'Worker not found' }, { status: 404 });
    }

    // Binary code (wasm) stays base64 end to end; the deployments table
    // decodes it into its bytea column. Text code keeps the string path.
    let update;
    let hash;

    if (body.codeType === 'wasm') {
      if (!Array.isArray(body.code)) {
        return json({ error: 'wasm code must be sent as a byte array' }, { status: 400 });
      }

      const scriptBase64 = base64Encode(Uint8Array.from(body.code));

      update = { scriptBase64, language: 'wasm' as const };
      hash = scriptBase64.slice(0, 16);
    } else {
      const script = Array.isArray(body.code) ? bytesToString(body.code) : body.code;
      const language = body.codeType === 'javascript' ? ('javascript' as const) : ('typescript' as const);

      update = { script, language };
      hash = stringToBase64(script).slice(0, 16);
    }

    const updatedWorker = await workersService.update(userId, worker.id, update);

    if (!updatedWorker) {
      return json({ error: 'Worker not found' }, { status: 404 });
    }

    return json({
      workerId: updatedWorker.id,
      version: updatedWorker.currentVersion,
      hash,
      codeType: body.codeType,
      deployedAt: new Date().toISOString(),
      message: body.message || null
    });
  } catch (error) {
    console.error('Failed to deploy worker:', error);
    return json(
      { error: 'Failed to deploy worker', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
