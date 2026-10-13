<script lang="ts">
  import { page } from '$app/state';
  import ResourceDetail from '#lib/components/resource-detail.svelte';
  import { deleteEnvironment, updateEnvironment } from '../environment.remote.ts';
  import EnvironmentValues from './environment-values.svelte';
  import * as Card from '#lib/components/ui/card/index.ts';

  let { data } = $props();
  let id = $derived(page.params.id!);
</script>

{#key id}
  <ResourceDetail {id} update={updateEnvironment} remove={deleteEnvironment} listHref="/environments" item={data.item}>
    {#snippet extra()}
      <EnvironmentValues
        {id}
        values={data.item.values ?? []}
        storage={data.storage}
        kv={data.kv}
        databases={data.databases}
        workers={data.workers}
        d1={data.d1}
        d1Enabled={data.profile.limits.d1 > 0 || data.d1.length > 0}
        durableObjects={data.durableObjects}
        durableObjectsEnabled={data.profile.limits.durableObjects > 0 || data.durableObjects.length > 0}
      />

      <Card.Root>
        <Card.Header>
          <Card.Title>Workers</Card.Title>
          <Card.Description>The workers that use this environment.</Card.Description>
        </Card.Header>
        <Card.Content>
          {#if data.item.workers?.length}
            <ul class="flex flex-col gap-1">
              {#each data.item.workers as worker (worker.id)}
                <li><a href={`/worker/${worker.id}`} class="hover:underline">{worker.name}</a></li>
              {/each}
            </ul>
          {:else}
            <p class="text-muted-foreground text-sm">
              No worker uses this environment. Choose it on the page of a worker.
            </p>
          {/if}
        </Card.Content>
      </Card.Root>
    {/snippet}
  </ResourceDetail>
{/key}
