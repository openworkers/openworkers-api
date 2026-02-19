import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cronsService } from '$lib/services/crons';
import { CronCreateInputSchema, CronSchema } from '$lib/types';
import { jsonResponse, parseAndValidate } from '$lib/server/validate';

// POST /api/v1/crons - Create cron
export const POST: RequestHandler = async ({ locals, request }) => {
  const userId = locals.userId;
  const payload = await parseAndValidate(request, CronCreateInputSchema);

  try {
    const cron = await cronsService.create(userId, payload);
    return jsonResponse(CronSchema, cron, 201);
  } catch (error) {
    console.error('Failed to create cron:', error);
    return json(
      { error: 'Failed to create cron', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
