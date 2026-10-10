<script lang="ts">
  import { untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { api, ApiError } from '$lib/api';
  import { confirmDialog } from '$lib/confirm.svelte';
  import type { IWorker } from '$lib/types';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import * as Select from '$lib/components/ui/select';
  import * as Card from '$lib/components/ui/card';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import PageHeader from '$lib/components/page-header.svelte';
  import WorkerCrons from '$lib/components/worker-crons.svelte';
  import { ArrowRight, Code, ExternalLink, ScrollText, Trash2 } from '@lucide/svelte';
  import { workerUrl } from '$lib/utils/worker-url';

  let { data } = $props();
  let id = $derived(page.params.id!);

  // Seeded from the SSR loader (workersService.findById) — no client fetch.
  let worker = $state<IWorker | null>(untrack(() => data.worker));
  let name = $state(untrack(() => data.worker.name ?? ''));
  let desc = $state(untrack(() => data.worker.desc ?? ''));
  let domainsText = $state(
    untrack(() => (data.worker.domains ?? []).map((d) => d.name).join('\n'))
  );
  // '' is no environment
  let environment = $state(untrack(() => data.worker.environment?.id ?? ''));
  let environmentName = $derived(
    data.environments.find((e) => e.id === environment)?.name ?? 'None'
  );
  let loading = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);

  // SvelteKit reuses this component on param-only navigation between workers;
  // reseed the form when the loaded worker changes so A's settings can never
  // be saved onto B.
  $effect(() => {
    const w = data.worker;

    untrack(() => {
      worker = w;
      name = w.name ?? '';
      desc = w.desc ?? '';
      domainsText = (w.domains ?? []).map((d) => d.name).join('\n');
      environment = w.environment?.id ?? '';
      error = null;
    });
  });

  async function saveSettings(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    error = null;

    const domains = domainsText
      .split('\n')
      .map((d) => d.trim())
      .filter(Boolean);

    try {
      await api.patch(`/api/v1/workers/${id}`, {
        name,
        desc: desc || null,
        domains,
        environment: environment || null
      });
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to save';
    } finally {
      saving = false;
    }
  }

  async function remove() {
    const confirmed = await confirmDialog({
      title: `Delete ${worker?.name ?? 'this worker'}`,
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true
    });

    if (!confirmed) return;

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
    {#if worker?.name}
      <Button
        variant="outline"
        href={workerUrl(worker.name, page.url.host)}
        target="_blank"
        rel="noopener"
      >
        <ExternalLink class="size-4" />
        View
      </Button>
    {/if}
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
            <Label for="environment">Environment</Label>
            <div class="flex gap-2">
              <Select.Root type="single" bind:value={environment}>
                <Select.Trigger id="environment" class="flex-1">{environmentName}</Select.Trigger>
                <Select.Content>
                  <Select.Item value="" label="None">None</Select.Item>
                  {#each data.environments as env (env.id)}
                    <Select.Item value={env.id} label={env.name ?? env.id}>{env.name ?? env.id}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
              {#if environment}
                <Button
                  variant="outline"
                  size="icon"
                  href={`/environment/${environment}`}
                  aria-label="Open the environment"
                  title="Open the environment"
                >
                  <ArrowRight class="size-4" />
                </Button>
              {:else}
                <Button variant="outline" size="icon" disabled aria-label="No environment">
                  <ArrowRight class="size-4" />
                </Button>
              {/if}
            </div>
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

    <!-- Keyed: WorkerCrons seeds its cron list once at mount. -->
    {#key id}
      <WorkerCrons workerId={id} crons={worker.crons ?? []} />
    {/key}
  {:else}
    <p class="text-destructive text-sm">{error}</p>
  {/if}
</div>
