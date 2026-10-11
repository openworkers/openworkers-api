<script lang="ts">
  import ResourceList from '#lib/components/resource-list.svelte';
  import { deleteEnvironment } from '../environment/environment.remote.ts';

  let { data } = $props();
</script>

<ResourceList
  title="Environments"
  description="Shared variables, secrets and bindings."
  remove={deleteEnvironment}
  createHref="/environment/create"
  rowHref={(id) => `/environment/${id}`}
  emptyLabel="No environments yet."
  items={data.items}
  limit={data.profile.limits.environments}
/>
