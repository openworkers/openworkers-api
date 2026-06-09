<script lang="ts">
  import { page } from '$app/state';
  import ResourceDetail from '$lib/components/resource-detail.svelte';
  import EnvironmentValues from '$lib/components/environment-values.svelte';

  let { data } = $props();
  let id = $derived(page.params.id!);
</script>

{#key id}
  <ResourceDetail base="environments" {id} listHref="/environments" initialItem={data.item}>
    {#snippet extra()}
      <EnvironmentValues
        {id}
        values={data.item.values ?? []}
        storage={data.storage}
        kv={data.kv}
        databases={data.databases}
        workers={data.workers}
      />
    {/snippet}
  </ResourceDetail>
{/key}
