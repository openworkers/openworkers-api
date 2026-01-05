import { Hono } from 'hono';
import { storageService } from '../services/storage';
import { StorageConfigSchema, StorageConfigCreateInputSchema, StorageConfigUpdateInputSchema } from '../types';
import { jsonResponse, jsonArrayResponse } from '../utils/validate';
import { S3Client, type S3Config } from '../utils/s3';
import { sharedStorage } from '../config';
import type { StorageConfigRow } from '../services/db/storage';

const storage = new Hono();

/**
 * Build S3Config from storage config row, using sharedStorage as fallback.
 */
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

// GET /storage - List all storage configs for current user
storage.get('/', async (c) => {
  const userId = c.get('userId');

  try {
    const configs = await storageService.findAll(userId);
    return jsonArrayResponse(c, StorageConfigSchema, configs);
  } catch (error) {
    console.error('Failed to fetch storage configs:', error);
    return c.json({ error: 'Failed to fetch storage configs' }, 500);
  }
});

// GET /storage/:id - Get single storage config
storage.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  try {
    const config = await storageService.findById(userId, id);

    if (!config) {
      return c.json({ error: 'Storage config not found' }, 404);
    }

    return jsonResponse(c, StorageConfigSchema, config);
  } catch (error) {
    console.error('Failed to fetch storage config:', error);
    return c.json({ error: 'Failed to fetch storage config' }, 500);
  }
});

// POST /storage - Create new storage config
storage.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  try {
    const payload = StorageConfigCreateInputSchema.parse(body);
    const config = await storageService.create(userId, payload);

    return jsonResponse(c, StorageConfigSchema, config, 201);
  } catch (error) {
    console.error('Failed to create storage config:', error);
    return c.json(
      {
        error: 'Failed to create storage config',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      error instanceof Error && error.message.includes('limit') ? 403 : 500
    );
  }
});

// PATCH /storage/:id - Update storage config
storage.patch('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = await c.req.json();

  try {
    const payload = StorageConfigUpdateInputSchema.parse(body);
    const config = await storageService.update(userId, id, payload);

    if (!config) {
      return c.json({ error: 'Storage config not found' }, 404);
    }

    return jsonResponse(c, StorageConfigSchema, config);
  } catch (error) {
    console.error('Failed to update storage config:', error);
    return c.json(
      {
        error: 'Failed to update storage config',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

// POST /storage/:id/presign - Get presigned URL for upload
storage.post('/:id/presign', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = await c.req.json();

  const { filename, filesize, filetype, checksum } = body as {
    filename: string;
    filesize: number;
    filetype: string;
    checksum: string;
  };

  if (!filename || !filesize || !filetype || !checksum) {
    return c.json({ error: 'Missing required fields: filename, filesize, filetype, checksum' }, 400);
  }

  if (filesize > 100 * 1024 * 1024) {
    return c.json({ error: 'File too large. Maximum size is 100MB.' }, 413);
  }

  try {
    const config = await storageService.getConfigWithCredentials(userId, id);

    if (!config) {
      return c.json({ error: 'Storage config not found' }, 404);
    }

    const s3Config = buildS3Config(config);

    if (!s3Config) {
      return c.json({ error: 'Storage endpoint not configured' }, 500);
    }

    const client = new S3Client(s3Config);
    const url = await client.presignPut(filename, {
      contentType: filetype,
      contentLength: filesize,
      checksum
    });

    return c.json({ url, key: filename });
  } catch (error) {
    console.error('Failed to create presigned URL:', error);
    return c.json(
      {
        error: 'Failed to create presigned URL',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

// GET /storage/:id/files - List files in storage
storage.get('/:id/files', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const prefix = c.req.query('prefix');
  const cursor = c.req.query('cursor');

  try {
    const config = await storageService.getConfigWithCredentials(userId, id);

    if (!config) {
      return c.json({ error: 'Storage config not found' }, 404);
    }

    const s3Config = buildS3Config(config);

    if (!s3Config) {
      return c.json({ error: 'Storage endpoint not configured' }, 500);
    }

    const client = new S3Client(s3Config);
    const result = await client.list(prefix, cursor);

    return c.json(result);
  } catch (error) {
    console.error('Failed to list files:', error);
    return c.json({ error: 'Failed to list files' }, 500);
  }
});

// GET /storage/:id/files/:key/presign - Get presigned URL to download a file
storage.get('/:id/files/*/presign', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const key = c.req.path.split('/files/')[1]!.replace('/presign', '');

  if (!key) {
    return c.json({ error: 'File key is required' }, 400);
  }

  try {
    const config = await storageService.getConfigWithCredentials(userId, id);

    if (!config) {
      return c.json({ error: 'Storage config not found' }, 404);
    }

    const s3Config = buildS3Config(config);

    if (!s3Config) {
      return c.json({ error: 'Storage endpoint not configured' }, 500);
    }

    const client = new S3Client(s3Config);
    const url = await client.presignGet(key);

    return c.json({ url });
  } catch (error) {
    console.error('Failed to create presigned URL:', error);
    return c.json({ error: 'Failed to create presigned URL' }, 500);
  }
});

// DELETE /storage/:id/files/:key - Delete a file
storage.delete('/:id/files/*', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const key = c.req.path.split('/files/')[1];

  if (!key) {
    return c.json({ error: 'File key is required' }, 400);
  }

  try {
    const config = await storageService.getConfigWithCredentials(userId, id);

    if (!config) {
      return c.json({ error: 'Storage config not found' }, 404);
    }

    const s3Config = buildS3Config(config);

    if (!s3Config) {
      return c.json({ error: 'Storage endpoint not configured' }, 500);
    }

    const client = new S3Client(s3Config);
    const deleted = await client.delete(key);

    if (!deleted) {
      return c.json({ error: 'Failed to delete file' }, 500);
    }

    return c.json({ deleted: true });
  } catch (error) {
    console.error('Failed to delete file:', error);
    return c.json({ error: 'Failed to delete file' }, 500);
  }
});

// DELETE /storage/:id - Delete storage config
storage.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  try {
    const deleted = await storageService.delete(userId, id);

    if (!deleted) {
      return c.json({ error: 'Storage config not found' }, 404);
    }

    return c.json({ deleted: true });
  } catch (error) {
    console.error('Failed to delete storage config:', error);
    return c.json({ error: 'Failed to delete storage config' }, 500);
  }
});

export default storage;
