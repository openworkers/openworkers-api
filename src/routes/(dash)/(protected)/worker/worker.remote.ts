import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { command, form } from '$app/server';
import { workersService } from '#lib/services/workers.ts';
import { cronsService } from '#lib/services/crons.ts';
import { defaultWorkerScript } from '#lib/server/default-worker.ts';
import { issueOnServiceError, requireUserId, requireUserIdInCommand } from '#lib/server/remote-guards.ts';
import { ResourceSettingsSchema } from '#lib/server/remote-schemas.ts';
import { ResourceCreateInputSchema } from '#lib/types/schemas/base.schema.ts';
import { WorkerLanguageSchema } from '#lib/types/schemas/worker.schema.ts';

const CreateWorkerSchema = ResourceCreateInputSchema.extend({
  language: WorkerLanguageSchema.extract(['typescript', 'javascript'])
});

export const createWorker = form(CreateWorkerSchema, async (input) => {
  const userId = requireUserId();

  const worker = await issueOnServiceError(
    workersService.create(userId, {
      name: input.name,
      desc: input.desc || null,
      language: input.language,
      script: defaultWorkerScript(input.language)
    })
  );

  redirect(303, `/worker/${worker.id}/edit`);
});

const SettingsSchema = ResourceSettingsSchema.extend({
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

export const deleteWorker = command(z.uuid(), async (id) => {
  const userId = requireUserIdInCommand();

  if ((await workersService.delete(userId, id)) === 0) {
    error(404, 'Worker not found');
  }
});

export const deployWorkerScript = command(z.object({ id: z.uuid(), script: z.string() }), async ({ id, script }) => {
  const userId = requireUserIdInCommand();

  if (!(await workersService.update(userId, id, { script }))) {
    error(404, 'Worker not found');
  }
});

export const addWorkerCron = form(
  z.object({ workerId: z.uuid(), expression: z.string().trim().min(1) }),
  async ({ workerId, expression }) => {
    const userId = requireUserId();

    await issueOnServiceError(cronsService.create(userId, { workerId, value: expression }));
  }
);

export const deleteWorkerCron = command(z.uuid(), async (id) => {
  const userId = requireUserIdInCommand();

  if ((await cronsService.delete(userId, id)) === 0) {
    error(404, 'Cron not found');
  }
});
