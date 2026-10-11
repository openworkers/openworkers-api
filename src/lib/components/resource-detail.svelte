<script lang="ts">
  import { untrack } from 'svelte';
  import { goto, refreshAll } from '$app/navigation';
  import { api, ApiError } from '#lib/api.ts';
  import { confirmDialog } from '#lib/confirm.svelte.ts';
  import { Button } from '#lib/components/ui/button/index.ts';
  import { Input } from '#lib/components/ui/input/index.ts';
  import { Label } from '#lib/components/ui/label/index.ts';
  import * as Card from '#lib/components/ui/card/index.ts';
  import PageHeader from './page-header.svelte';
  import type { Snippet } from 'svelte';
  import { hydration } from '#lib/hydration.svelte.ts';

  type Resource = { id: string; name: string | null; desc?: string | null };

  let {
    base,
    id,
    listHref,
    extra,
    item
  }: {
    base: string;
    id: string;
    listHref: string;
    extra?: Snippet<[Resource]>;
    item: Resource;
  } = $props();

  let name = $state(untrack(() => item.name ?? ''));
  let desc = $state(untrack(() => item.desc ?? ''));
  let saving = $state(false);
  let error = $state<string | null>(null);

  // Reseed the form from the loaded item, after a save or on navigation to another item.
  $effect(() => {
    const loaded = item;

    untrack(() => {
      name = loaded.name ?? '';
      desc = loaded.desc ?? '';
      error = null;
    });
  });

  async function save(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    error = null;

    try {
      await api.patch(`/api/v1/${base}/${id}`, { name, desc: desc || null });
      await refreshAll();
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to save';
    } finally {
      saving = false;
    }
  }

  async function remove() {
    const confirmed = await confirmDialog({
      title: `Delete ${item.name ?? 'this resource'}`,
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true
    });

    if (!confirmed) return;

    try {
      await api.del(`/api/v1/${base}/${id}`);
      await goto(listHref);
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to delete';
    }
  }

</script>

<PageHeader title={item.name ?? '(unnamed)'}>
  {#snippet actions()}
    <Button variant="outline" href={listHref}>Back</Button>
    <Button variant="destructive" onclick={remove}>Delete</Button>
  {/snippet}
</PageHeader>

<div class="flex max-w-xl flex-col gap-6 p-8">
  <Card.Root>
    <Card.Header>
      <Card.Title>Settings</Card.Title>
    </Card.Header>
    <Card.Content>
      <form class="flex flex-col gap-4" onsubmit={save}>
        <fieldset class="contents" disabled={!hydration.done}>
          <div class="flex flex-col gap-2">
            <Label for="name">Name</Label>
            <Input id="name" bind:value={name} required />
          </div>

          <div class="flex flex-col gap-2">
            <Label for="desc">Description</Label>
            <Input id="desc" bind:value={desc} />
          </div>

          {#if error}
            <p class="text-destructive text-sm">{error}</p>
          {/if}

          <div class="flex justify-end">
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </fieldset>
      </form>
    </Card.Content>
  </Card.Root>

  {#if extra}
    {@render extra(item)}
  {/if}
</div>
