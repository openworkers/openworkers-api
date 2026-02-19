import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/services/db/client';

export const GET: RequestHandler = async () => {
  try {
    const result = await sql<{ result: number }>('SELECT 1 + 1 AS result');
    return json({ status: 'ok', result: result[0]?.result });
  } catch (error) {
    return json({ status: 'error', error: String(error) }, { status: 500 });
  }
};
