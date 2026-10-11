import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { command, form } from '$app/server';
import { createApiKey, deleteApiKey } from '#lib/services/db/api-keys.ts';
import { requireUserId, requireUserIdInCommand } from '#lib/server/remote-guards.ts';

export const createAccountApiKey = form(z.object({ name: z.string().trim().min(1).max(100) }), async ({ name }) => {
  const userId = requireUserId();
  const { token } = await createApiKey(userId, name);

  // Shown once: only its hash is stored
  return { token };
});

export const revokeAccountApiKey = command(z.uuid(), async (id) => {
  const userId = requireUserIdInCommand();

  if (!(await deleteApiKey(userId, id))) {
    error(404, 'API key not found');
  }
});
