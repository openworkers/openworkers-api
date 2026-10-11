import { redirect } from '@sveltejs/kit';
import { form } from '$app/server';
import { kvService } from '#lib/services/kv.ts';
import { issueOnServiceError, requireUserId } from '#lib/server/remote-guards.ts';
import { ResourceCreateInputSchema } from '#lib/types/schemas/base.schema.ts';

export const createKvNamespace = form(ResourceCreateInputSchema, async (input) => {
  const userId = requireUserId();

  const namespace = await issueOnServiceError(
    kvService.create(userId, { name: input.name, desc: input.desc || undefined })
  );

  redirect(303, `/kv/${namespace.id}`);
});
