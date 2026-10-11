import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { command, form } from '$app/server';
import { databasesService } from '#lib/services/databases.ts';
import { errorOnServiceError, requireUserId, requireUserIdInCommand } from '#lib/server/remote-guards.ts';
import { ResourceSettingsSchema } from '#lib/server/remote-schemas.ts';
import {
  DatabaseCreatePlatformInputSchema,
  DatabaseCreatePostgresInputSchema
} from '#lib/types/schemas/database.schema.ts';

const CreateDatabaseSchema = z.discriminatedUnion('provider', [
  DatabaseCreatePlatformInputSchema.extend({ provider: z.literal('platform') }),
  DatabaseCreatePostgresInputSchema.omit({ connectionString: true }).extend({
    // SvelteKit does not send back fields that start with '_' when the form is invalid
    _connectionString: DatabaseCreatePostgresInputSchema.shape.connectionString
  })
]);

export const createDatabase = form(CreateDatabaseSchema, async (input) => {
  const userId = requireUserId();
  const { name, maxRows, timeoutSeconds } = input;
  const desc = input.desc || undefined;

  const database = await databasesService.create(
    userId,
    input.provider === 'platform'
      ? { provider: 'platform', name, desc, maxRows, timeoutSeconds }
      : { provider: 'postgres', name, desc, maxRows, timeoutSeconds, connectionString: input._connectionString }
  );

  redirect(303, `/database/${database.id}`);
});

export const updateDatabase = form(ResourceSettingsSchema, async (input) => {
  const userId = requireUserId();

  const database = await databasesService.update(userId, input.id, { name: input.name, desc: input.desc || null });

  if (!database) {
    error(404, 'Database not found');
  }
});

export const deleteDatabase = command(z.uuid(), async (id) => {
  const userId = requireUserIdInCommand();

  if (!(await errorOnServiceError(databasesService.delete(userId, id)))) {
    error(404, 'Database not found');
  }
});
