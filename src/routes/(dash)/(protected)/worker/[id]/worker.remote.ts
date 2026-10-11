import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { form } from '$app/server';
import { requireUserId } from '#lib/server/remote-guards.ts';
import { workersService } from '#lib/services/workers.ts';
import { ResourceUpdateInputSchema } from '#lib/types/schemas/base.schema.ts';

const { name, desc } = ResourceUpdateInputSchema.shape;

const SettingsSchema = z.object({
  id: z.uuid(),
  name: name.unwrap(),
  desc: desc.unwrap().unwrap(),
  // '' is no environment
  environment: z.union([z.uuid(), z.literal('')]),
  // One domain per line
  domains: z.string()
});

export const updateWorkerSettings = form(SettingsSchema, async (input) => {
  const userId = requireUserId();

  const worker = await workersService.update(userId, input.id, {
    name: input.name,
    desc: input.desc || null,
    environment: input.environment || null,
    domains: input.domains
      .split('\n')
      .map((d) => d.trim())
      .filter(Boolean)
  });

  if (!worker) {
    error(404, 'Worker not found');
  }
});
