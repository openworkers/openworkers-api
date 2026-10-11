<script lang="ts">
  import { page } from '$app/state';
  import ResourceDetail from '#lib/components/resource-detail.svelte';
  import ResourceUsages from '#lib/components/resource-usages.svelte';

  let { data } = $props();
  let id = $derived(page.params.id!);
</script>

{#key id}
  <ResourceDetail base="databases" {id} listHref="/databases" item={data.item}>
    {#snippet extra()}
      <ResourceUsages usages={data.usages} />
    {/snippet}
  </ResourceDetail>
{/key}
