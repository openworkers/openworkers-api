import { sharedStorageConfigured } from '#lib/config/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
  return { platformStorage: sharedStorageConfigured() };
};
