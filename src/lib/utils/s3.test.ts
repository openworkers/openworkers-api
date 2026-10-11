import { describe, test, expect } from 'bun:test';
import { S3Client } from './s3';

const client = new S3Client({
  bucket: 'shared',
  endpoint: 'https://s3.example',
  accessKeyId: 'key',
  secretAccessKey: 'secret',
  prefix: 'tenant-a'
});

describe('S3Client keys', () => {
  // The prefix is what keeps the files of one account apart on the shared bucket
  test.each(['../tenant-b/file.txt', 'folder/../../tenant-b/file.txt', './../tenant-b/file.txt', '..'])(
    'refuses %s, which would leave the prefix',
    async (key) => {
      const url = await client.presignGet(key).catch(() => null);

      expect(url === null || new URL(url).pathname.startsWith('/shared/tenant-a/')).toBe(true);
      expect(url).toBeNull();
    }
  );

  test('signs a key under the prefix', async () => {
    const url = await client.presignGet('folder/file.txt');

    expect(new URL(url).pathname).toBe('/shared/tenant-a/folder/file.txt');
  });
});
