import { AwsClient } from 'aws4fetch';

export interface S3Config {
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string | null;
  prefix?: string | null;
}

export interface S3File {
  key: string;
  size: number;
  lastModified: string;
}

export interface S3ListResult {
  files: S3File[];
  cursor: string | null;
}

/**
 * S3-compatible storage client.
 * Handles prefix automatically for all operations.
 */
export class S3Client {
  private client: AwsClient;
  private bucket: string;
  private endpoint: string;
  private prefix: string | null;

  constructor(config: S3Config) {
    this.client = new AwsClient({
      region: config.region ?? 'auto',
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      service: 's3'
    });
    this.bucket = config.bucket;
    this.endpoint = config.endpoint;
    this.prefix = config.prefix ?? null;
  }

  /**
   * Build the full key with prefix.
   */
  private fullKey(key: string): string {
    return this.prefix ? `${this.prefix}/${key}` : key;
  }

  /**
   * Strip prefix from a key (for list results).
   */
  private stripPrefix(key: string): string {
    if (this.prefix && key.startsWith(this.prefix + '/')) {
      return key.slice(this.prefix.length + 1);
    }

    return key;
  }

  /**
   * Build URL for a key.
   */
  private url(key: string): URL {
    return new URL(`${this.endpoint}/${this.bucket}/${this.fullKey(key)}`);
  }

  /**
   * Upload a file.
   */
  async put(key: string, body: BodyInit, contentType?: string): Promise<boolean> {
    const req = new Request(this.url(key).toString(), {
      method: 'PUT',
      body,
      headers: contentType ? { 'Content-Type': contentType } : undefined
    });

    const signedReq = await this.client.sign(req);
    const res = await fetch(signedReq);

    return res.ok;
  }

  /**
   * Delete a file.
   */
  async delete(key: string): Promise<boolean> {
    const req = new Request(this.url(key).toString(), { method: 'DELETE' });
    const signedReq = await this.client.sign(req);
    const res = await fetch(signedReq);

    return res.ok || res.status === 204;
  }

  /**
   * List files with optional prefix filter.
   */
  async list(prefix?: string, cursor?: string): Promise<S3ListResult> {
    const fullPrefix = this.prefix ? (prefix ? `${this.prefix}/${prefix}` : `${this.prefix}/`) : (prefix ?? '');

    const url = new URL(`${this.endpoint}/${this.bucket}`);
    url.searchParams.append('list-type', '2');
    url.searchParams.append('prefix', fullPrefix);
    url.searchParams.append('max-keys', '100');

    if (cursor) {
      url.searchParams.append('continuation-token', cursor);
    }

    const req = new Request(url.toString(), { method: 'GET' });
    const signedReq = await this.client.sign(req);
    const res = await fetch(signedReq);

    if (!res.ok) {
      throw new Error(`S3 list failed: ${res.status}`);
    }

    const xml = await res.text();
    const files: S3File[] = [];
    const contentRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
    let match;

    while ((match = contentRegex.exec(xml)) !== null) {
      const content = match[1]!;
      const key = content.match(/<Key>(.*?)<\/Key>/)?.[1] ?? '';
      const size = parseInt(content.match(/<Size>(.*?)<\/Size>/)?.[1] ?? '0', 10);
      const lastModified = content.match(/<LastModified>(.*?)<\/LastModified>/)?.[1] ?? '';

      const displayKey = this.stripPrefix(key);

      if (displayKey) {
        files.push({ key: displayKey, size, lastModified });
      }
    }

    const isTruncated = xml.includes('<IsTruncated>true</IsTruncated>');
    const nextCursor = xml.match(/<NextContinuationToken>(.*?)<\/NextContinuationToken>/)?.[1];

    return {
      files,
      cursor: isTruncated ? (nextCursor ?? null) : null
    };
  }

  /**
   * Get a presigned URL for uploading.
   */
  async presignPut(
    key: string,
    options: { contentType: string; contentLength: number; checksum?: string; expiresIn?: number }
  ): Promise<string> {
    const url = this.url(key);
    url.searchParams.append('X-Amz-Expires', String(options.expiresIn ?? 300));

    const headers: Record<string, string> = {
      'Content-Type': options.contentType,
      'Content-Length': String(options.contentLength)
    };

    if (options.checksum) {
      headers['x-amz-checksum-sha256'] = options.checksum;
    }

    const req = new Request(url.toString(), { method: 'PUT', headers });
    const signedReq = await this.client.sign(req, { aws: { signQuery: true, allHeaders: true } });

    return signedReq.url;
  }

  /**
   * Get a presigned URL for downloading.
   */
  async presignGet(key: string, expiresIn?: number): Promise<string> {
    const url = this.url(key);
    url.searchParams.append('X-Amz-Expires', String(expiresIn ?? 300));

    const req = new Request(url.toString(), { method: 'GET' });
    const signedReq = await this.client.sign(req, { aws: { signQuery: true } });

    return signedReq.url;
  }
}

/**
 * Create an S3 client from a storage config.
 */
export function createS3Client(config: S3Config): S3Client {
  return new S3Client(config);
}
