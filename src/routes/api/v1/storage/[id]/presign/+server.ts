import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { storageService } from '$lib/services/storage';
import { S3Client, type S3Config } from '$lib/utils/s3';
import { sharedStorage } from '$lib/config';
import type { StorageConfigRow } from '$lib/services/db/storage';

function buildS3Config(config: StorageConfigRow): S3Config | null {
  const endpoint = config.endpoint ?? sharedStorage.endpoint;

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

// POST /api/v1/storage/:id/presign - Get presigned URL for upload
export const POST: RequestHandler = async ({ locals, params, request }) => {
  const userId = locals.userId;
  const idOrName = params.id;
  const body = await request.json();

  const { filename, filesize, filetype, checksum } = body as {
    filename: string;
    filesize: number;
    filetype: string;
    checksum: string;
  };

  if (!filename || !filesize || !filetype || !checksum) {
    return json({ error: 'Missing required fields: filename, filesize, filetype, checksum' }, { status: 400 });
  }

  if (filesize > 100 * 1024 * 1024) {
    return json({ error: 'File too large. Maximum size is 100MB.' }, { status: 413 });
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
    const url = await client.presignPut(filename, {
      contentType: filetype,
      contentLength: filesize,
      checksumBase64: checksum
    });

    return json({ url, key: filename });
  } catch (error) {
    console.error('Failed to create presigned URL:', error);
    return json(
      { error: 'Failed to create presigned URL', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
