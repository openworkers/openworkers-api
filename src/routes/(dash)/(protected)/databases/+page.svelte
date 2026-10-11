<script lang="ts">
  import ResourceList from '#lib/components/resource-list.svelte';
  import { deleteDatabase } from '../database/database.remote.ts';

  let { data } = $props();
</script>

<ResourceList
  title="Databases"
  description="Platform, Postgres and PlanetScale databases."
  remove={deleteDatabase}
  createHref="/database/create"
  rowHref={(id) => `/database/${id}`}
  emptyLabel="No databases yet."
  items={data.items}
  limit={data.profile.limits.databases}
/>
