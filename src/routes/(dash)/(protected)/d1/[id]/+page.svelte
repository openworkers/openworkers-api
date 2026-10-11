<script lang="ts">
  import { page } from '$app/state';
  import ResourceDetail from '#lib/components/resource-detail.svelte';
  import ResourceUsages from '#lib/components/resource-usages.svelte';
  import { deleteD1Database, updateD1Database } from '../d1.remote.ts';
  import D1Console from './d1-console.svelte';

  let { data } = $props();
  let id = $derived(page.params.id!);
</script>

{#key id}
  <ResourceDetail {id} update={updateD1Database} remove={deleteD1Database} listHref="/d1-databases" item={data.item}>
    {#snippet extra()}
      <ResourceUsages usages={data.usages} />
      <D1Console {id} />
    {/snippet}
  </ResourceDetail>
{/key}
