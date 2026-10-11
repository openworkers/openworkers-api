<script lang="ts">
  import ResourceList from '#lib/components/resource-list.svelte';
  import { deleteD1Database } from '../d1/d1.remote.ts';

  let { data } = $props();
</script>

<ResourceList
  title="D1"
  description={data.profile.limits.d1 > 0
    ? 'SQLite databases in the runner, with the Cloudflare D1 API.'
    : 'D1 is not enabled for your account.'}
  remove={deleteD1Database}
  createHref="/d1/create"
  rowHref={(id) => `/d1/${id}`}
  emptyLabel="No D1 databases yet."
  items={data.items}
  limit={data.profile.limits.d1}
/>
