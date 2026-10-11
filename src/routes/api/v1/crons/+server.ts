import type { RequestHandler } from './$types';
import { cronsService } from '#lib/services/crons.ts';
import { CronCreateInputSchema, CronSchema } from '#lib/types/index.ts';
import { jsonResponse, parseAndValidate } from '#lib/server/validate.ts';

// POST /api/v1/crons - Create cron
export const POST: RequestHandler = async ({ locals, request }) => {
  const userId = locals.userId;
  const payload = await parseAndValidate(request, CronCreateInputSchema);

  try {
    const cron = await cronsService.create(userId, payload);
    return jsonResponse(CronSchema, cron, 201);
  } catch (error) {
    console.error('Failed to create cron:', error);
    return Response.json(
      { error: 'Failed to create cron', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
