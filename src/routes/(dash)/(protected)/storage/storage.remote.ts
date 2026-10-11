import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { command, form } from '$app/server';
import { storageService } from '#lib/services/storage.ts';
import { issueOnServiceError, requireUserId, requireUserIdInCommand } from '#lib/server/remote-guards.ts';
import { ResourceSettingsSchema } from '#lib/server/remote-schemas.ts';
import {
  MASKED_SECRET,
  StorageConfigCreatePlatformInputSchema,
  StorageConfigCreateS3InputSchema,
  StorageConfigUpdateInputSchema
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

const { bucket, prefix, accessKeyId, secretAccessKey, endpoint, region, publicUrl } =
  StorageConfigUpdateInputSchema.shape;

const S3SettingsSchema = z.object({
  id: z.uuid(),
  bucket: bucket.unwrap(),
  prefix: prefix.unwrap().unwrap(),
  endpoint: endpoint.unwrap().unwrap(),
  region: region.unwrap().unwrap(),
  publicUrl: publicUrl.unwrap().unwrap(),
  // Empty or still masked keeps the current credential
  accessKeyId: z.union([accessKeyId.unwrap(), z.literal('')]),
  _secretAccessKey: z.union([secretAccessKey.unwrap(), z.literal('')])
});

const changed = (value: string) => (value && value !== MASKED_SECRET ? value : undefined);

export const updateStorageS3Settings = form(S3SettingsSchema, async (input) => {
  const userId = requireUserId();

  // A platform config uses the shared credentials; its bucket and prefix must not change
  if ((await storageService.findById(userId, input.id))?.provider !== 's3') {
    error(404, 'S3 storage config not found');
  }

  await issueOnServiceError(
    storageService.update(userId, input.id, {
      bucket: input.bucket,
      prefix: input.prefix || null,
      endpoint: input.endpoint || null,
      region: input.region || null,
      publicUrl: input.publicUrl || null,
      accessKeyId: changed(input.accessKeyId),
      secretAccessKey: changed(input._secretAccessKey)
    })
  );

  return { saved: true };
});
