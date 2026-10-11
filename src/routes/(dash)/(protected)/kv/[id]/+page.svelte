<script lang="ts">
  import { page } from '$app/state';
  import ResourceDetail from '#lib/components/resource-detail.svelte';
  import ResourceUsages from '#lib/components/resource-usages.svelte';
  import KvData from '#lib/components/kv-data.svelte';

  let { data } = $props();
  let id = $derived(page.params.id!);
</script>

{#key id}
  <ResourceDetail base="kv" {id} listHref="/kv-namespaces" initialItem={data.item}>
    {#snippet extra()}
      <ResourceUsages usages={data.usages} />
      <KvData {id} />
    {/snippet}
  </ResourceDetail>
{/key}
