<script lang="ts">
  import { untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { api, ApiError } from '$lib/api';
  import type { IWorker } from '$lib/types';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import * as Card from '$lib/components/ui/card';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import PageHeader from '$lib/components/page-header.svelte';
  import WorkerCrons from '$lib/components/worker-crons.svelte';
  import { Code, ScrollText, Trash2 } from '@lucide/svelte';

  let { data } = $props();
  let id = $derived(page.params.id!);

  // Seeded from the SSR loader (workersService.findById) — no client fetch.
  let worker = $state<IWorker | null>(untrack(() => data.worker));
  let name = $state(untrack(() => data.worker.name ?? ''));
  let desc = $state(untrack(() => data.worker.desc ?? ''));
  let domainsText = $state(
    untrack(() => (data.worker.domains ?? []).map((d) => d.name).join('\n'))
  );
  let loading = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);

  async function saveSettings(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    error = null;

    const domains = domainsText
      .split('\n')
      .map((d) => d.trim())
      .filter(Boolean);

    try {
      await api.patch(`/api/v1/workers/${id}`, { name, desc: desc || null, domains });
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to save';
    } finally {
      saving = false;
    }
  }

  async function remove() {
    if (!confirm(`Delete worker "${worker?.name}"?`)) return;

    try {
      await api.del(`/api/v1/workers/${id}`);
      await goto('/workers');
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to delete';
    }
  }

</script>

<PageHeader title={worker?.name ?? 'Loading…'}>
  {#snippet actions()}
    <Button variant="outline" href={`/worker/${id}/edit`}>
      <Code class="size-4" />
      Edit code
    </Button>
    <Button variant="outline" href={`/worker/${id}/logs`}>
      <ScrollText class="size-4" />
      Logs
    </Button>
    <Button variant="destructive" size="icon" onclick={remove} aria-label="Delete">
      <Trash2 class="size-4" />
    </Button>
  {/snippet}
</PageHeader>

<div class="flex max-w-2xl flex-col gap-6 p-8">
  {#if loading}
    <Skeleton class="h-40 w-full" />
  {:else if worker}
    <Card.Root>
      <Card.Header><Card.Title>Settings</Card.Title></Card.Header>
      <Card.Content>
        <form class="flex flex-col gap-4" onsubmit={saveSettings}>
          <div class="flex flex-col gap-2">
            <Label for="name">Name</Label>
            <Input id="name" bind:value={name} required />
          </div>
          <div class="flex flex-col gap-2">
            <Label for="desc">Description</Label>
            <Input id="desc" bind:value={desc} />
          </div>
          <div class="flex flex-col gap-2">
            <Label for="domains">Domains <span class="text-muted-foreground">(one per line)</span></Label>
            <Textarea id="domains" bind:value={domainsText} rows={3} class="font-mono" />
          </div>

          {#if error}<p class="text-destructive text-sm">{error}</p>{/if}

          <div class="flex justify-end">
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Card.Content>
    </Card.Root>

    <WorkerCrons workerId={id} crons={worker.crons ?? []} />
  {:else}
    <p class="text-destructive text-sm">{error}</p>
  {/if}
</div>
