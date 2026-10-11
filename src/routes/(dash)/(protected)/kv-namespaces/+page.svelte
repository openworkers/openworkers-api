<script lang="ts">
  import ResourceList from '#lib/components/resource-list.svelte';
  import { deleteKvNamespace } from '../kv/kv.remote.ts';

  let { data } = $props();
</script>

<ResourceList
  title="KV Namespaces"
  description="Key-value stores for your workers."
  remove={deleteKvNamespace}
  createHref="/kv/create"
  rowHref={(id) => `/kv/${id}`}
  emptyLabel="No KV namespaces yet."
  items={data.items}
  limit={data.profile.limits.kv}
/>
