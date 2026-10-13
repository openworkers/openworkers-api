<script lang="ts">
  import { page } from '$app/state';
  import ResourceDetail from '#lib/components/resource-detail.svelte';
  import ResourceUsages from '#lib/components/resource-usages.svelte';
  import * as Card from '#lib/components/ui/card/index.ts';
  import { deleteNamespace, updateNamespace } from '../durable-object.remote.ts';

  let { data } = $props();
  let id = $derived(page.params.id!);
</script>

{#key id}
  <ResourceDetail
    {id}
    update={updateNamespace}
    remove={deleteNamespace}
    removeWarning={'The storage of every object of the namespace goes with it. This cannot be undone.'}
    listHref="/durable-objects"
    item={data.item}
  >
    {#snippet extra()}
      <Card.Root>
        <Card.Header>
          <Card.Title>Class</Card.Title>
          <Card.Description>The objects of this namespace are instances of this class.</Card.Description>
        </Card.Header>
        <Card.Content class="text-sm">
          {#if data.item.workerId}
            <code>{data.item.className}</code> of
            <a href={`/worker/${data.item.workerId}`} class="hover:underline"
              >{data.item.workerName ?? data.item.workerId}</a
            >
          {:else}
            <code>{data.item.className}</code> of a worker that was deleted: the objects do not run, and their storage stays
            until the namespace is deleted.
          {/if}
        </Card.Content>
      </Card.Root>

      <ResourceUsages usages={data.usages} />
    {/snippet}
  </ResourceDetail>
{/key}
