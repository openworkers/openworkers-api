import { redirect } from '@sveltejs/kit';
import { form } from '$app/server';
import { environmentsService } from '#lib/services/environments.ts';
import { issueOnServiceError, requireUserId } from '#lib/server/remote-guards.ts';
import { ResourceCreateInputSchema } from '#lib/types/schemas/base.schema.ts';

export const createEnvironment = form(ResourceCreateInputSchema, async (input) => {
  const userId = requireUserId();

  const environment = await issueOnServiceError(
    environmentsService.create(userId, { name: input.name, desc: input.desc || null })
  );

  redirect(303, `/environment/${environment.id}`);
});
