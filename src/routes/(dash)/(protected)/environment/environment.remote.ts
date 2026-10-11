import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { command, form } from '$app/server';
import { environmentsService } from '#lib/services/environments.ts';
import {
  errorOnServiceError,
  issueOnServiceError,
  requireUserId,
  requireUserIdInCommand
} from '#lib/server/remote-guards.ts';
import { ResourceSettingsSchema } from '#lib/server/remote-schemas.ts';
import { ResourceCreateInputSchema } from '#lib/types/schemas/base.schema.ts';
import { EnvironmentValueUpdateInputSchema } from '#lib/types/schemas/environment.schema.ts';

export const createEnvironment = form(ResourceCreateInputSchema, async (input) => {
  const userId = requireUserId();

  const environment = await issueOnServiceError(
    environmentsService.create(userId, { name: input.name, desc: input.desc || null })
  );

  redirect(303, `/environment/${environment.id}`);
});

export const updateEnvironment = form(ResourceSettingsSchema, async (input) => {
  const userId = requireUserId();

  if (!(await environmentsService.findById(userId, input.id))) {
    error(404, 'Environment not found');
  }

  await issueOnServiceError(
    environmentsService.update(userId, input.id, { id: input.id, name: input.name, desc: input.desc || null })
  );
});

export const deleteEnvironment = command(z.uuid(), async (id) => {
  const userId = requireUserIdInCommand();

  if ((await environmentsService.delete(userId, id)) === 0) {
    error(404, 'Environment not found');
  }
});

export const saveEnvironmentValues = command(
  z.object({ id: z.uuid(), values: z.array(EnvironmentValueUpdateInputSchema) }),
  async ({ id, values }) => {
    const userId = requireUserIdInCommand();

    if (!(await environmentsService.findById(userId, id))) {
      error(404, 'Environment not found');
    }

    await errorOnServiceError(environmentsService.updateValues(userId, id, values));

    return (await environmentsService.findById(userId, id))?.values ?? [];
  }
);
