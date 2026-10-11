<script lang="ts">
  import { page } from '$app/state';
  import ResourceList from '#lib/components/resource-list.svelte';
  import { deleteWorker } from '../worker/worker.remote.ts';
  import { workerUrl } from '#lib/utils/worker-url.ts';

  let { data } = $props();
</script>

<ResourceList
  title="Workers"
  description="Your deployed workers."
  remove={deleteWorker}
  createHref="/worker/create"
  rowHref={(id) => `/worker/${id}`}
  emptyLabel="No workers yet."
  items={data.workers}
  limit={data.profile.limits.workers}
  viewHref={(worker) => workerUrl(worker.name ?? '', page.url.host, page.data.workerDomain)}
/>
