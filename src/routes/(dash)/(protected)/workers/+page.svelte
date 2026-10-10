<script lang="ts">
  import { page } from '$app/state';
  import ResourceList from '$lib/components/resource-list.svelte';
  import { workerUrl } from '$lib/utils/worker-url';

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
  limit={data.profile.limits.workers}
  viewHref={(worker) => workerUrl(worker.name ?? '', page.url.host)}
/>
