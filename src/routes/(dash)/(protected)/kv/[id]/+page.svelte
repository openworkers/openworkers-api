<script lang="ts">
  import { page } from '$app/state';
  import ResourceDetail from '$lib/components/resource-detail.svelte';
  import KvData from '$lib/components/kv-data.svelte';

  let { data } = $props();
  let id = $derived(page.params.id!);
</script>

{#key id}
  <ResourceDetail base="kv" {id} listHref="/kv-namespaces" initialItem={data.item}>
    {#snippet extra()}
      <KvData {id} />
    {/snippet}
  </ResourceDetail>
{/key}
