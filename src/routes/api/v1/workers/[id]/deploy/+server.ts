import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { workersService } from '$lib/services/workers';
import { stringToBase64, bytesToString } from '$lib/utils/base64';

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

    const script = Array.isArray(body.code) ? bytesToString(body.code) : body.code;
    const language = body.codeType === 'javascript' ? 'javascript' : 'typescript';

    const updatedWorker = await workersService.update(userId, worker.id, {
      script,
      language
    });

    if (!updatedWorker) {
      return json({ error: 'Worker not found' }, { status: 404 });
    }

    return json({
      workerId: updatedWorker.id,
      version: updatedWorker.currentVersion,
      hash: stringToBase64(script).slice(0, 16),
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
