<script lang="ts">
  import { untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { confirmDialog } from '#lib/confirm.svelte.ts';
  import { remoteErrorMessage } from '#lib/remote-errors.ts';
  import { Button } from '#lib/components/ui/button/index.ts';
  import { Input } from '#lib/components/ui/input/index.ts';
  import { Label } from '#lib/components/ui/label/index.ts';
  import { Textarea } from '#lib/components/ui/textarea/index.ts';
  import * as Select from '#lib/components/ui/select/index.ts';
  import * as Card from '#lib/components/ui/card/index.ts';
  import PageHeader from '#lib/components/page-header.svelte';
  import WorkerCrons from './worker-crons.svelte';
  import { ArrowRight, Code, ExternalLink, ScrollText, Trash2 } from '@lucide/svelte';
  import { workerUrl } from '#lib/utils/worker-url.ts';
  import { hydration } from '#lib/hydration.svelte.ts';
  import { deleteWorker, updateWorkerSettings } from '../worker.remote.ts';

  let { data } = $props();
  let id = $derived(page.params.id!);

  let worker = $derived(data.worker);
  let settings = $derived(updateWorkerSettings.for(worker.id));
  let domainsText = $state(untrack(() => (data.worker.domains ?? []).map((d) => d.name).join('\n')));
  // '' is no environment
  let environment = $state(untrack(() => data.worker.environment?.id ?? ''));
  let environmentName = $derived(data.environments.find((e) => e.id === environment)?.name ?? 'None');
  let error = $state<string | null>(null);

  // SvelteKit reuses this component on param-only navigation between workers;
  // reseed the form when the loaded worker changes so A's settings can never
  // be saved onto B.
  $effect(() => {
    const w = data.worker;

    untrack(() => {
      domainsText = (w.domains ?? []).map((d) => d.name).join('\n');
      environment = w.environment?.id ?? '';
      error = null;
    });
  });

  async function remove() {
    const confirmed = await confirmDialog({
      title: `Delete ${worker.name ?? 'this worker'}`,
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true
    });

    if (!confirmed) return;

    try {
      await deleteWorker(worker.id);
      await goto('/workers');
    } catch (e) {
      error = remoteErrorMessage(e, 'Failed to delete');
    }
  }
</script>

<PageHeader title={worker.name ?? '(unnamed)'}>
  {#snippet actions()}
    <Button variant="outline" href={`/worker/${id}/edit`}>
      <Code class="size-4" />
      Edit code
    </Button>
    {#if worker.name}
      <Button
        variant="outline"
        href={workerUrl(worker.name, page.url.host, page.data.workerDomain)}
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
  <Card.Root>
    <Card.Header><Card.Title>Settings</Card.Title></Card.Header>
    <Card.Content>
      <form class="flex flex-col gap-4" {...settings}>
        <fieldset class="contents" disabled={!hydration.done}>
          <input {...settings.fields.id.as('hidden', worker.id)} />
          <input {...settings.fields.environment.as('hidden', environment)} />
          <input {...settings.fields.domains.as('hidden', domainsText)} />
          <div class="flex flex-col gap-2">
            <Label for="name">Name</Label>
            <Input id="name" {...settings.fields.name.as('text', worker.name ?? '')} required />
          </div>
          <div class="flex flex-col gap-2">
            <Label for="desc">Description</Label>
            <Input id="desc" {...settings.fields.desc.as('text', worker.desc ?? '')} />
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

          {#each settings.fields.allIssues() ?? [] as issue (issue.message)}
            <p class="text-destructive text-sm">{issue.message}</p>
          {/each}
          {#if error}<p class="text-destructive text-sm">{error}</p>{/if}

          <div class="flex justify-end">
            <Button type="submit" disabled={settings.pending > 0}>
              {settings.pending > 0 ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </fieldset>
      </form>
    </Card.Content>
  </Card.Root>

  <!-- Keyed: another worker starts with an empty cron input. -->
  {#key id}
    <WorkerCrons workerId={id} crons={worker.crons ?? []} />
  {/key}
</div>
