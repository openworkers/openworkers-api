<script lang="ts">
  import { page } from '$app/state';
  import ResourceDetail from '$lib/components/resource-detail.svelte';
  import DatabaseConsole from '$lib/components/database-console.svelte';

  let { data } = $props();
  let id = $derived(page.params.id!);
</script>

{#key id}
  <ResourceDetail base="databases" {id} listHref="/databases" initialItem={data.item}>
    {#snippet extra()}
      <DatabaseConsole {id} />
    {/snippet}
  </ResourceDetail>
{/key}
