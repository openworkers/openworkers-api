<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { RemoteCommand, RemoteForm } from '$app/server';
  import { goto } from '$app/navigation';
  import { confirmDialog } from '#lib/confirm.svelte.ts';
  import { remoteErrorMessage } from '#lib/remote-errors.ts';
  import { Button } from '#lib/components/ui/button/index.ts';
  import { Input } from '#lib/components/ui/input/index.ts';
  import { Label } from '#lib/components/ui/label/index.ts';
  import * as Card from '#lib/components/ui/card/index.ts';
  import PageHeader from './page-header.svelte';
  import FieldIssues from './field-issues.svelte';

  type Resource = { id: string; name: string | null; desc?: string | null };

  let {
    id,
    listHref,
    update,
    remove,
    extra,
    item
  }: {
    id: string;
    listHref: string;
    update: RemoteForm<{ id: string; name: string; desc: string }, unknown>;
    remove: RemoteCommand<string, void>;
    extra?: Snippet<[Resource]>;
    item: Resource;
  } = $props();

  let settings = $derived(update.for(id));
  let error = $state<string | null>(null);

  async function confirmRemove() {
    const confirmed = await confirmDialog({
      title: `Delete ${item.name ?? 'this resource'}`,
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true
    });

    if (!confirmed) return;

    try {
      await remove(id);
      await goto(listHref);
    } catch (e) {
      error = remoteErrorMessage(e, 'Failed to delete');
    }
  }
</script>

<PageHeader title={item.name ?? '(unnamed)'}>
  {#snippet actions()}
    <Button variant="outline" href={listHref}>Back</Button>
    <Button variant="destructive" onclick={confirmRemove}>Delete</Button>
  {/snippet}
</PageHeader>

<div class="flex max-w-xl flex-col gap-6 p-8">
  <Card.Root>
    <Card.Header>
      <Card.Title>Settings</Card.Title>
    </Card.Header>
    <Card.Content>
      <form class="flex flex-col gap-4" {...settings}>
        <input {...settings.fields.id.as('hidden', id)} />
        <div class="flex flex-col gap-2">
          <Label for="name">Name</Label>
          <Input id="name" {...settings.fields.name.as('text', item.name ?? '')} required />
          <FieldIssues issues={settings.fields.name.issues()} />
        </div>

        <div class="flex flex-col gap-2">
          <Label for="desc">Description</Label>
          <Input id="desc" {...settings.fields.desc.as('text', item.desc ?? '')} />
          <FieldIssues issues={settings.fields.desc.issues()} />
        </div>

        <FieldIssues issues={settings.fields.issues()} />
        {#if error}
          <p class="text-destructive text-sm">{error}</p>
        {/if}

        <div class="flex justify-end">
          <Button type="submit" disabled={!!settings.pending}>{settings.pending ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Card.Content>
  </Card.Root>

  {#if extra}
    {@render extra(item)}
  {/if}
</div>
