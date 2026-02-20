import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { storageService } from '$lib/services/storage';
import { S3Client, type S3Config } from '$lib/utils/s3';
import { getStorageConfig } from '$lib/config';
import type { StorageConfigRow } from '$lib/services/db/storage';

function buildS3Config(config: StorageConfigRow): S3Config | null {
  const endpoint = config.endpoint ?? getStorageConfig().endpoint;

  if (!endpoint) {
    return null;
  }

  return {
    bucket: config.bucket,
    endpoint,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: config.region,
    prefix: config.prefix
  };
}

// DELETE /api/v1/storage/:id/files/[...path] - Delete a file
export const DELETE: RequestHandler = async ({ locals, params }) => {
  const userId = locals.userId;
  const idOrName = params.id;
  const key = params.path;

  if (!key) {
    return json({ error: 'File key is required' }, { status: 400 });
  }

  try {
    const config = await storageService.getConfigWithCredentialsByIdOrName(userId, idOrName);

    if (!config) {
      return json({ error: 'Storage config not found' }, { status: 404 });
    }

    const s3Config = buildS3Config(config);

    if (!s3Config) {
      return json({ error: 'Storage endpoint not configured' }, { status: 500 });
    }

    const client = new S3Client(s3Config);
    const deleted = await client.delete(key);

    if (!deleted) {
      return json({ error: 'Failed to delete file' }, { status: 500 });
    }

    return json({ deleted: true });
  } catch (error) {
    console.error('Failed to delete file:', error);
    return json({ error: 'Failed to delete file' }, { status: 500 });
  }
};
