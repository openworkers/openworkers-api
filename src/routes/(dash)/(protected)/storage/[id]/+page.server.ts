import { error } from '@sveltejs/kit';
import { storageService } from '#lib/services/storage.ts';
import { environmentsService } from '#lib/services/environments.ts';
import type { PageServerLoad } from './$types';

// Long enough for a page left open a while
const DOWNLOAD_URL_SECONDS = 3600;

export const load: PageServerLoad = async ({ locals, params, url }) => {
  const item = await storageService.findById(locals.userId, params.id);

  if (!item) {
    throw error(404, 'Not found');
  }

  const prefix = url.searchParams.get('prefix') ?? '';
  const cursor = url.searchParams.get('cursor') ?? undefined;

  const [usages, files] = await Promise.all([
    environmentsService.findBindingUsages(locals.userId, item.id),
    listFiles(locals.userId, item.id, prefix, cursor)
  ]);

  return { item, usages, prefix, ...files };
};

async function listFiles(userId: string, id: string, prefix: string, cursor: string | undefined) {
  try {
    const client = await storageService.s3Client(userId, id);

    if (!client) {
      return { files: [], cursor: null, filesError: 'This storage has no endpoint.' };
    }

    const result = await client.list(prefix || undefined, cursor);
    const files = await Promise.all(
      result.files.map(async (file) => ({ ...file, url: await client.presignGet(file.key, DOWNLOAD_URL_SECONDS) }))
    );

    return { files, cursor: result.cursor, filesError: null };
  } catch (e) {
    console.error('Failed to list storage files:', e);
    return { files: [], cursor: null, filesError: 'The storage did not answer. Check its settings.' };
  }
}
