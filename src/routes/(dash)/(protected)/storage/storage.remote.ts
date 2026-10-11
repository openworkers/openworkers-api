import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { command, form } from '$app/server';
import { storageService } from '#lib/services/storage.ts';
import { issueOnServiceError, requireUserId, requireUserIdInCommand } from '#lib/server/remote-guards.ts';
import { ResourceSettingsSchema } from '#lib/server/remote-schemas.ts';
import {
  StorageConfigCreatePlatformInputSchema,
  StorageConfigCreateS3InputSchema
} from '#lib/types/schemas/storage.schema.ts';
import type { IStorageConfigCreateInput } from '#lib/types/index.ts';

const CreateStorageSchema = z.discriminatedUnion('provider', [
  StorageConfigCreatePlatformInputSchema,
  StorageConfigCreateS3InputSchema.omit({ secretAccessKey: true }).extend({
    // SvelteKit does not send back fields that start with '_' when the form is invalid
    _secretAccessKey: StorageConfigCreateS3InputSchema.shape.secretAccessKey
  })
]);

export const createStorageConfig = form(CreateStorageSchema, async (input) => {
  const userId = requireUserId();

  const config: IStorageConfigCreateInput =
    input.provider === 'platform'
      ? { provider: 'platform', name: input.name, desc: input.desc || undefined }
      : {
          provider: 's3',
          name: input.name,
          desc: input.desc || undefined,
          bucket: input.bucket,
          accessKeyId: input.accessKeyId,
          secretAccessKey: input._secretAccessKey,
          endpoint: input.endpoint || undefined,
          region: input.region || undefined,
          prefix: input.prefix || undefined,
          publicUrl: input.publicUrl || undefined
        };

  const created = await issueOnServiceError(storageService.create(userId, config));

  redirect(303, `/storage/${created.id}`);
});

export const updateStorageConfig = form(ResourceSettingsSchema, async (input) => {
  const userId = requireUserId();

  const config = await issueOnServiceError(
    storageService.update(userId, input.id, { name: input.name, desc: input.desc || null })
  );

  if (!config) {
    error(404, 'Storage config not found');
  }
});

export const deleteStorageConfig = command(z.uuid(), async (id) => {
  const userId = requireUserIdInCommand();

  if (!(await storageService.delete(userId, id))) {
    error(404, 'Storage config not found');
  }
});
