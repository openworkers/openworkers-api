import { Hono } from 'hono';
import { AwsClient } from 'aws4fetch';
import { storageService } from '../services/storage';
import { StorageConfigSchema, StorageConfigCreateInputSchema, StorageConfigUpdateInputSchema } from '../types';
import { jsonResponse, jsonArrayResponse } from '../utils/validate';
import { sharedStorage } from '../config';

const storage = new Hono();

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
    checksum: string; // Base64-encoded SHA-256
  };

  if (!filename || !filesize || !filetype || !checksum) {
    return c.json({ error: 'Missing required fields: filename, filesize, filetype, checksum' }, 400);
  }

  // 100MB limit
  if (filesize > 100 * 1024 * 1024) {
    return c.json({ error: 'File too large. Maximum size is 100MB.' }, 413);
  }

  try {
    // Get storage config with credentials
    const config = await storageService.getConfigWithCredentials(userId, id);

    if (!config) {
      return c.json({ error: 'Storage config not found' }, 404);
    }

    // Build the S3 key with prefix
    const key = config.prefix ? `${config.prefix}/${filename}` : filename;

    // Determine endpoint
    const endpoint = config.endpoint ?? sharedStorage.endpoint;

    if (!endpoint) {
      return c.json({ error: 'Storage endpoint not configured' }, 500);
    }

    // Create AWS client
    const client = new AwsClient({
      region: config.region ?? 'auto',
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      service: 's3'
    });

    // Build presigned URL
    const url = new URL(`${endpoint}/${config.bucket}/${key}`);
    url.searchParams.append('X-Amz-Expires', '300'); // 5 minutes

    const req = new Request(url.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': filetype,
        'Content-Length': String(filesize),
        'x-amz-checksum-sha256': checksum
      }
    });

    const signedReq = await client.sign(req, { aws: { signQuery: true, allHeaders: true } });

    return c.json({
      url: signedReq.url,
      key
    });
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
  const prefix = c.req.query('prefix') ?? '';
  const cursor = c.req.query('cursor');

  try {
    const config = await storageService.getConfigWithCredentials(userId, id);

    if (!config) {
      return c.json({ error: 'Storage config not found' }, 404);
    }

    const endpoint = config.endpoint ?? sharedStorage.endpoint;

    if (!endpoint) {
      return c.json({ error: 'Storage endpoint not configured' }, 500);
    }

    const client = new AwsClient({
      region: config.region ?? 'auto',
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      service: 's3'
    });

    // Build the full prefix (config prefix + user prefix)
    const fullPrefix = config.prefix ? (prefix ? `${config.prefix}/${prefix}` : `${config.prefix}/`) : prefix;

    const url = new URL(`${endpoint}/${config.bucket}`);
    url.searchParams.append('list-type', '2');
    url.searchParams.append('prefix', fullPrefix);
    url.searchParams.append('max-keys', '100');

    if (cursor) {
      url.searchParams.append('continuation-token', cursor);
    }

    const req = new Request(url.toString(), { method: 'GET' });
    const signedReq = await client.sign(req);
    const res = await fetch(signedReq);

    if (!res.ok) {
      const text = await res.text();
      console.error('S3 list failed:', text);
      return c.json({ error: 'Failed to list files' }, 500);
    }

    const xml = await res.text();

    // Parse XML response
    const files: { key: string; size: number; lastModified: string }[] = [];
    const contentRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
    let match;

    while ((match = contentRegex.exec(xml)) !== null) {
      const content = match[1]!;
      const key = content.match(/<Key>(.*?)<\/Key>/)?.[1] ?? '';
      const size = parseInt(content.match(/<Size>(.*?)<\/Size>/)?.[1] ?? '0', 10);
      const lastModified = content.match(/<LastModified>(.*?)<\/LastModified>/)?.[1] ?? '';

      // Strip the config prefix from the key for display
      const displayKey =
        config.prefix && key.startsWith(config.prefix + '/') ? key.slice(config.prefix.length + 1) : key;

      // Skip empty keys (folder markers)
      if (!displayKey) continue;

      files.push({ key: displayKey, size, lastModified });
    }

    const isTruncated = xml.includes('<IsTruncated>true</IsTruncated>');
    const nextCursor = xml.match(/<NextContinuationToken>(.*?)<\/NextContinuationToken>/)?.[1];

    return c.json({
      files,
      cursor: isTruncated ? nextCursor : null
    });
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

    const endpoint = config.endpoint ?? sharedStorage.endpoint;

    if (!endpoint) {
      return c.json({ error: 'Storage endpoint not configured' }, 500);
    }

    const client = new AwsClient({
      region: config.region ?? 'auto',
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      service: 's3'
    });

    // Build full key with prefix
    const fullKey = config.prefix ? `${config.prefix}/${key}` : key;

    const url = new URL(`${endpoint}/${config.bucket}/${fullKey}`);
    url.searchParams.append('X-Amz-Expires', '300'); // 5 minutes

    const req = new Request(url.toString(), { method: 'GET' });
    const signedReq = await client.sign(req, { aws: { signQuery: true } });

    return c.json({ url: signedReq.url });
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

    const endpoint = config.endpoint ?? sharedStorage.endpoint;

    if (!endpoint) {
      return c.json({ error: 'Storage endpoint not configured' }, 500);
    }

    const client = new AwsClient({
      region: config.region ?? 'auto',
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      service: 's3'
    });

    // Build full key with prefix
    const fullKey = config.prefix ? `${config.prefix}/${key}` : key;

    const url = new URL(`${endpoint}/${config.bucket}/${fullKey}`);
    const req = new Request(url.toString(), { method: 'DELETE' });
    const signedReq = await client.sign(req);
    const res = await fetch(signedReq);

    if (!res.ok && res.status !== 204) {
      const text = await res.text();
      console.error('S3 delete failed:', text);
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
