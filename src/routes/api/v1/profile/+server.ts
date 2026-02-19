import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { findUserById } from '$lib/services/db';
import { SelfSchema } from '$lib/types';
import { jsonResponse } from '$lib/server/validate';

export const GET: RequestHandler = async ({ locals }) => {
  const userId = locals.userId;

  try {
    const user = await findUserById(userId);

    if (!user) {
      return json({ error: 'User not found' }, { status: 404 });
    }

    return jsonResponse(SelfSchema, user);
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
};
