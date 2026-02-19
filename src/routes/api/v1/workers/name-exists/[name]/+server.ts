import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkWorkerNameExists } from '$lib/services/db/workers';

export const GET: RequestHandler = async ({ params }) => {
  const name = params.name;

  try {
    const exists = await checkWorkerNameExists(name);
    return json({ exists });
  } catch (error) {
    console.error('Failed to check worker name:', error);
    return json({ error: 'Failed to check worker name' }, { status: 500 });
  }
};
