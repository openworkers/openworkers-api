import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { command, form } from '$app/server';
import { kvService } from '#lib/services/kv.ts';
import { issueOnServiceError, requireUserId, requireUserIdInCommand } from '#lib/server/remote-guards.ts';
import { ResourceSettingsSchema } from '#lib/server/remote-schemas.ts';
import { ResourceCreateInputSchema } from '#lib/types/schemas/base.schema.ts';

export const createKvNamespace = form(ResourceCreateInputSchema, async (input) => {
  const userId = requireUserId();

  const namespace = await issueOnServiceError(
    kvService.create(userId, { name: input.name, desc: input.desc || undefined })
  );

  redirect(303, `/kv/${namespace.id}`);
});

export const updateKvNamespace = form(ResourceSettingsSchema, async (input) => {
  const userId = requireUserId();

  const namespace = await issueOnServiceError(
    kvService.update(userId, input.id, { name: input.name, desc: input.desc || null })
  );

  if (!namespace) {
    error(404, 'KV namespace not found');
  }
});

export const deleteKvNamespace = command(z.uuid(), async (id) => {
  const userId = requireUserIdInCommand();

  if (!(await kvService.delete(userId, id))) {
    error(404, 'KV namespace not found');
  }
});

async function requireNamespace(userId: string, id: string) {
  const namespace = await kvService.findById(userId, id);

  if (!namespace) {
    error(404, 'KV namespace not found');
  }

  return namespace;
}

export const putKvEntry = form(
  z.object({ namespaceId: z.uuid(), key: z.string().min(1), value: z.string() }),
  async ({ namespaceId, key, value }) => {
    const userId = requireUserId();
    const namespace = await requireNamespace(userId, namespaceId);

    await issueOnServiceError(kvService.putData(namespace.id, key, value));
  }
);

export const deleteKvEntry = command(
  z.object({ namespaceId: z.uuid(), key: z.string() }),
  async ({ namespaceId, key }) => {
    const userId = requireUserIdInCommand();
    const namespace = await requireNamespace(userId, namespaceId);

    if (!(await kvService.deleteData(namespace.id, key))) {
      error(404, 'Key not found');
    }
  }
);
