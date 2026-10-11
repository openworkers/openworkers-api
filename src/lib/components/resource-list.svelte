<script lang="ts">
  import type { RemoteCommand } from '$app/server';
  import { refreshAll } from '$app/navigation';
  import { remoteErrorMessage } from '#lib/remote-errors.ts';
  import { confirmDialog } from '#lib/confirm.svelte.ts';
  import { Button } from '#lib/components/ui/button/index.ts';
  import * as Table from '#lib/components/ui/table/index.ts';
  import { ExternalLink, Plus, Trash2 } from '@lucide/svelte';
  import PageHeader from './page-header.svelte';

  type Row = { id: string; name: string | null; desc?: string | null; createdAt?: string | Date };

  let {
    title,
    description,
    remove,
    createHref,
    rowHref,
    emptyLabel = 'Nothing here yet.',
    items,
    limit,
    viewHref
  }: {
    title: string;
    description?: string;
    remove: RemoteCommand<string, void>;
    createHref: string;
    rowHref: (id: string) => string;
    emptyLabel?: string;
    items: Row[];
    // The most items the account can create; New is disabled at the limit.
    limit?: number;
    // A public URL of the item, opened in a new tab.
    viewHref?: (item: Row) => string;
  } = $props();

  let error = $state<string | null>(null);
  let full = $derived(limit !== undefined && items.length >= limit);

  async function confirmRemove(id: string, name: string) {
    const confirmed = await confirmDialog({
      title: `Delete ${name}`,
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true
    });

    if (!confirmed) {
      return;
    }

    error = null;

    try {
      await remove(id);
    } catch (e) {
      error = remoteErrorMessage(e, 'Failed to delete');
    }

    await refreshAll();
  }
</script>

<PageHeader {title} {description}>
  {#snippet actions()}
    {#if limit !== undefined}
      <span class="text-muted-foreground text-sm">{items.length} / {limit}</span>
    {/if}
    {#if full}
      <Button disabled title={`Maximum of ${limit} reached`}>
        <Plus class="size-4" />
        New
      </Button>
    {:else}
      <Button href={createHref}>
        <Plus class="size-4" />
        New
      </Button>
    {/if}
  {/snippet}
</PageHeader>

<div class="flex flex-col gap-4 p-8">
  {#if error}
    <p class="text-destructive text-sm">{error}</p>
  {/if}

  {#if items.length === 0}
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
          <Table.Head class={viewHref ? 'w-24' : 'w-12'}></Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each items as item (item.id)}
          <Table.Row class="cursor-pointer">
            <Table.Cell class="font-medium">
              <a href={rowHref(item.id)} class="hover:underline">{item.name ?? '(unnamed)'}</a>
            </Table.Cell>
            <Table.Cell class="text-muted-foreground">{item.desc ?? '—'}</Table.Cell>
            <Table.Cell class="text-right">
              {#if viewHref}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  href={viewHref(item)}
                  target="_blank"
                  rel="noopener"
                  aria-label="View"
                  title="View"
                >
                  <ExternalLink class="size-4" />
                </Button>
              {/if}
              <Button
                variant="ghost"
                size="icon-sm"
                onclick={() => confirmRemove(item.id, item.name ?? '')}
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
