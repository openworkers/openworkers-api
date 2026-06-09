import type { ISelf } from '$lib/types';
import { api } from '$lib/api';

// Shared, reactive auth state (Svelte 5 runes in a .svelte.ts module).
export const auth = $state<{ profile: ISelf | null; loaded: boolean }>({
  profile: null,
  loaded: false
});

export async function loadProfile(): Promise<ISelf | null> {
  try {
    auth.profile = await api.get<ISelf>('/api/v1/profile');
  } catch {
    auth.profile = null;
  } finally {
    auth.loaded = true;
  }

  return auth.profile;
}
