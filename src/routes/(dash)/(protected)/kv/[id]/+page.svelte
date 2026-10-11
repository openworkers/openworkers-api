<script lang="ts">
  import { page } from '$app/state';
  import ResourceDetail from '#lib/components/resource-detail.svelte';
  import { deleteKvNamespace, updateKvNamespace } from '../kv.remote.ts';
  import ResourceUsages from '#lib/components/resource-usages.svelte';
  import KvData from './kv-data.svelte';

  let { data } = $props();
  let id = $derived(page.params.id!);
</script>

{#key id}
  <ResourceDetail {id} update={updateKvNamespace} remove={deleteKvNamespace} listHref="/kv-namespaces" item={data.item}>
    {#snippet extra()}
      <ResourceUsages usages={data.usages} />
      <KvData {id} keys={data.keys} />
    {/snippet}
  </ResourceDetail>
{/key}
