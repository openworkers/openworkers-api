import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { findUserById } from '#lib/services/db/index.ts';
import { SelfSchema } from '#lib/types/index.ts';
import { jsonResponse } from '#lib/server/validate.ts';

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
