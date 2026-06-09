<script lang="ts">
  import ResourceList from '$lib/components/resource-list.svelte';

  let { data } = $props();
</script>

<ResourceList
  title="Workers"
  description="Your deployed workers."
  base="workers"
  createHref="/worker/create"
  rowHref={(id) => `/worker/${id}`}
  emptyLabel="No workers yet."
  initialItems={data.workers}
/>
