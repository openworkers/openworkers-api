<script lang="ts">
  import ResourceList from '$lib/components/resource-list.svelte';
</script>

<ResourceList
  title="Environments"
  description="Shared variables, secrets and bindings."
  base="environments"
  createHref="/environment/create"
  rowHref={(id) => `/environment/${id}`}
  emptyLabel="No environments yet."
/>
