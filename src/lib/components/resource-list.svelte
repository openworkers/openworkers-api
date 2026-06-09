<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { api, ApiError } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import * as Table from '$lib/components/ui/table';
  import { Plus, Trash2 } from '@lucide/svelte';
  import PageHeader from './page-header.svelte';

  type Row = { id: string; name: string | null; desc?: string | null; createdAt?: string | Date };

  let {
    title,
    description,
    base,
    createHref,
    rowHref,
    emptyLabel = 'Nothing here yet.',
    initialItems
  }: {
    title: string;
    description?: string;
    base: string;
    createHref: string;
    rowHref: (id: string) => string;
    emptyLabel?: string;
    // When provided (e.g. from an SSR +page.server.ts load), skip the client
    // fetch and render immediately.
    initialItems?: Row[];
  } = $props();

  let items = $state<Row[]>(untrack(() => initialItems ?? []));
  let loading = $state(untrack(() => !initialItems));
  let error = $state<string | null>(null);

  async function load() {
    loading = true;
    error = null;

    try {
      items = await api.get<Row[]>(`/api/v1/${base}`);
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to load';
    } finally {
      loading = false;
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await api.del(`/api/v1/${base}/${id}`);
      items = items.filter((i) => i.id !== id);
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to delete';
    }
  }

  onMount(() => {
    if (!initialItems) {
      load();
    }
  });
</script>

<PageHeader {title} {description}>
  {#snippet actions()}
    <Button href={createHref}>
      <Plus class="size-4" />
      New
    </Button>
  {/snippet}
</PageHeader>

<div class="p-8">
  {#if loading}
    <div class="flex flex-col gap-2">
      {#each Array(3) as _, i (i)}
        <Skeleton class="h-12 w-full" />
      {/each}
    </div>
  {:else if error}
    <p class="text-destructive text-sm">{error}</p>
  {:else if items.length === 0}
    <div class="rounded-lg border border-dashed p-12 text-center">
      <p class="text-muted-foreground text-sm">{emptyLabel}</p>
      <Button href={createHref} class="mt-4">
        <Plus class="size-4" />
        Create one
      </Button>
    </div>
  {:else}
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Name</Table.Head>
          <Table.Head>Description</Table.Head>
          <Table.Head class="w-12"></Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each items as item (item.id)}
          <Table.Row class="cursor-pointer">
            <Table.Cell class="font-medium">
              <a href={rowHref(item.id)} class="hover:underline">{item.name ?? '(unnamed)'}</a>
            </Table.Cell>
            <Table.Cell class="text-muted-foreground">{item.desc ?? '—'}</Table.Cell>
            <Table.Cell>
              <Button
                variant="ghost"
                size="icon-sm"
                onclick={() => remove(item.id, item.name ?? '')}
                aria-label="Delete"
              >
                <Trash2 class="size-4" />
              </Button>
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  {/if}
</div>
