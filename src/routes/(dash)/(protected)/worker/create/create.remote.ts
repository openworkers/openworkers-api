import { redirect } from '@sveltejs/kit';
import { form } from '$app/server';
import { workersService } from '#lib/services/workers.ts';
import { defaultWorkerScript } from '#lib/server/default-worker.ts';
import { issueOnServiceError, requireUserId } from '#lib/server/remote-guards.ts';
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
