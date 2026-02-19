import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/services/db/client';

export const GET: RequestHandler = async () => {
  try {
    const result = await sql<{ now: string }>('SELECT NOW() AS now');
    return json({ status: 'ok', timestamp: result[0]?.now });
  } catch (error) {
    return json({ status: 'error', error: String(error) }, { status: 500 });
  }
};
