<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { api, ApiError } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Card from '$lib/components/ui/card';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import PageHeader from './page-header.svelte';
  import type { Snippet } from 'svelte';

  type Resource = { id: string; name: string; desc?: string | null };

  let {
    base,
    id,
    listHref,
    extra
  }: {
    base: string;
    id: string;
    listHref: string;
    extra?: Snippet<[Resource]>;
  } = $props();

  let item = $state<Resource | null>(null);
  let name = $state('');
  let desc = $state('');
  let loading = $state(true);
  let saving = $state(false);
  let error = $state<string | null>(null);

  async function load() {
    try {
      item = await api.get<Resource>(`/api/v1/${base}/${id}`);
      name = item.name;
      desc = item.desc ?? '';
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to load';
    } finally {
      loading = false;
    }
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    error = null;

    try {
      await api.patch(`/api/v1/${base}/${id}`, { name, desc: desc || null });
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to save';
    } finally {
      saving = false;
    }
  }

  async function remove() {
    if (!confirm(`Delete "${item?.name}"? This cannot be undone.`)) return;

    try {
      await api.del(`/api/v1/${base}/${id}`);
      await goto(listHref);
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to delete';
    }
  }

  onMount(load);
</script>

<PageHeader title={item?.name ?? 'Loading…'}>
  {#snippet actions()}
    <Button variant="outline" href={listHref}>Back</Button>
    <Button variant="destructive" onclick={remove} disabled={loading}>Delete</Button>
  {/snippet}
</PageHeader>

<div class="flex max-w-xl flex-col gap-6 p-8">
  {#if loading}
    <Skeleton class="h-40 w-full" />
  {:else if error && !item}
    <p class="text-destructive text-sm">{error}</p>
  {:else if item}
    <Card.Root>
      <Card.Header>
        <Card.Title>Settings</Card.Title>
      </Card.Header>
      <Card.Content>
        <form class="flex flex-col gap-4" onsubmit={save}>
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
        </form>
      </Card.Content>
    </Card.Root>

    {#if extra}
      {@render extra(item)}
    {/if}
  {/if}
</div>
