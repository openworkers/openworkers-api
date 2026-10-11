<script lang="ts">
  import ResourceList from '#lib/components/resource-list.svelte';
  import { deleteStorageConfig } from '../storage/storage.remote.ts';

  let { data } = $props();
</script>

<ResourceList
  title="Storage"
  description="Platform and S3-compatible buckets."
  remove={deleteStorageConfig}
  createHref="/storage/create"
  rowHref={(id) => `/storage/${id}`}
  emptyLabel="No storage configs yet."
  items={data.items}
  limit={data.profile.limits.storage}
/>
