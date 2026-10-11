import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { command, form } from '$app/server';
import { databasesService } from '#lib/services/databases.ts';
import { requireUserId, requireUserIdInCommand } from '#lib/server/remote-guards.ts';
import { ResourceSettingsSchema } from '#lib/server/remote-schemas.ts';

export const updateDatabase = form(ResourceSettingsSchema, async (input) => {
  const userId = requireUserId();

  const database = await databasesService.update(userId, input.id, { name: input.name, desc: input.desc || null });

  if (!database) {
    error(404, 'Database not found');
  }
});

export const deleteDatabase = command(z.uuid(), async (id) => {
  const userId = requireUserIdInCommand();

  if (!(await databasesService.delete(userId, id))) {
    error(404, 'Database not found');
  }
});
