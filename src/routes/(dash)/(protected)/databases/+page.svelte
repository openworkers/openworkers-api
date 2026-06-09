<script lang="ts">
  import ResourceList from '$lib/components/resource-list.svelte';

  let { data } = $props();
</script>

<ResourceList
  title="Databases"
  description="Platform, Postgres and PlanetScale databases."
  base="databases"
  createHref="/database/create"
  rowHref={(id) => `/database/${id}`}
  emptyLabel="No databases yet."
  initialItems={data.items}
/>
