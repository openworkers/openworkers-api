<script lang="ts">
  import { refreshAll } from '$app/navigation';
  import { remoteErrorMessage } from '#lib/remote-errors.ts';
  import { Button } from '#lib/components/ui/button/index.ts';
  import { Input } from '#lib/components/ui/input/index.ts';
  import * as Card from '#lib/components/ui/card/index.ts';
  import { Trash2 } from '@lucide/svelte';
  import FieldIssues from '#lib/components/field-issues.svelte';
  import { addWorkerCron, deleteWorkerCron } from '../worker.remote.ts';

  type Cron = { id: string; value: string; nextRun?: string | Date | null };

  let { workerId, crons }: { workerId: string; crons: Cron[] } = $props();

  let add = $derived(addWorkerCron.for(workerId));
  let error = $state<string | null>(null);

  async function remove(cronId: string) {
    error = null;

    try {
      await deleteWorkerCron(cronId);
      await refreshAll();
    } catch (e) {
      error = remoteErrorMessage(e, 'Failed to delete cron');
    }
  }
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Cron triggers</Card.Title>
    <Card.Description>Schedule the worker with cron expressions.</Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-3">
    {#each crons as cron (cron.id)}
      <div class="flex items-center gap-2">
        <code class="bg-muted flex-1 rounded px-2 py-1 text-xs">{cron.value}</code>
        <Button variant="ghost" size="icon-sm" onclick={() => remove(cron.id)} aria-label="Delete">
          <Trash2 class="size-4" />
        </Button>
      </div>
    {/each}

    <form class="flex items-center gap-2" {...add}>
      <input {...add.fields.workerId.as('hidden', workerId)} />
      <Input class="flex-1 font-mono" placeholder="*/5 * * * *" {...add.fields.expression.as('text')} required />
      <Button type="submit" disabled={!!add.pending}>Add</Button>
    </form>

    <FieldIssues issues={add.fields.allIssues()} />
    {#if error}
      <p class="text-destructive text-sm">{error}</p>
    {/if}
  </Card.Content>
</Card.Root>
