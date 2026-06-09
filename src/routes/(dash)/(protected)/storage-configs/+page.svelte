<script lang="ts">
  import ResourceList from '$lib/components/resource-list.svelte';

  let { data } = $props();
</script>

<ResourceList
  title="Storage"
  description="Platform and S3-compatible buckets."
  base="storage"
  createHref="/storage/create"
  rowHref={(id) => `/storage/${id}`}
  emptyLabel="No storage configs yet."
  initialItems={data.items}
/>
