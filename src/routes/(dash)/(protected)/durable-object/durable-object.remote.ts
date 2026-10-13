import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { command, form } from '$app/server';
import { durableObjectsService } from '#lib/services/durable-objects.ts';
import {
  errorOnServiceError,
  issueOnServiceError,
  requireUserId,
  requireUserIdInCommand
} from '#lib/server/remote-guards.ts';
import { ResourceSettingsSchema } from '#lib/server/remote-schemas.ts';
import { DurableObjectNamespaceCreateInputSchema } from '#lib/types/schemas/durable-object.schema.ts';

export const createNamespace = form(DurableObjectNamespaceCreateInputSchema, async (input) => {
  const userId = requireUserId();

  const namespace = await issueOnServiceError(
    durableObjectsService.create(userId, {
      name: input.name,
      desc: input.desc || undefined,
      worker: input.worker,
      className: input.className
    })
  );

  redirect(303, `/durable-object/${namespace.id}`);
});

export const updateNamespace = form(ResourceSettingsSchema, async (input) => {
  const userId = requireUserId();

  const namespace = await issueOnServiceError(
    durableObjectsService.update(userId, input.id, { name: input.name, desc: input.desc || null })
  );

  if (!namespace) {
    error(404, 'Durable Object namespace not found');
  }
});

export const deleteNamespace = command(z.uuid(), async (id) => {
  const userId = requireUserIdInCommand();

  if (!(await errorOnServiceError(durableObjectsService.delete(userId, id)))) {
    error(404, 'Durable Object namespace not found');
  }
});
