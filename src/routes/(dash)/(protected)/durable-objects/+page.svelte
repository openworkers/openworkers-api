<script lang="ts">
  import ResourceList from '#lib/components/resource-list.svelte';
  import { deleteNamespace } from '../durable-object/durable-object.remote.ts';

  let { data } = $props();
</script>

<ResourceList
  title="Durable Objects"
  description={data.profile.limits.durableObjects > 0
    ? 'One instance of a class of a worker per id, with its own storage, alarms and WebSockets.'
    : 'Durable Objects are not enabled for your account.'}
  remove={deleteNamespace}
  removeWarning={'The storage of every object of the namespace goes with it. This cannot be undone.'}
  createHref="/durable-object/create"
  rowHref={(id) => `/durable-object/${id}`}
  emptyLabel="No Durable Object namespaces yet."
  items={data.items}
  limit={data.profile.limits.durableObjects}
/>
