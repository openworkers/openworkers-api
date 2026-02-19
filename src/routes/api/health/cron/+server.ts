import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { WasmCron } from '@openworkers/croner-wasm';

export const GET: RequestHandler = async ({ url }) => {
  const pattern = url.searchParams.get('pattern') || '*/5 * * * *';

  try {
    const cron = new WasmCron(pattern);
    return json({
      status: 'ok',
      wasm: true,
      pattern: cron.pattern(),
      description: cron.describe(),
      nextRun: cron.nextRun()?.toISOString() ?? null,
      nextRuns: cron.nextRuns(5).map((d: Date) => d.toISOString())
    });
  } catch (error) {
    return json({ status: 'error', wasm: true, error: String(error) }, { status: 400 });
  }
};
