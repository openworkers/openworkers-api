<script lang="ts">
  import { untrack } from 'svelte';
  import { api, ApiError } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import * as Card from '$lib/components/ui/card';
  import { Trash2 } from '@lucide/svelte';

  type Cron = { id: string; value: string; nextRun?: string | Date | null };

  let { workerId, crons: initial }: { workerId: string; crons: Cron[] } = $props();

  // One-time seed from the prop; the list is mutated locally afterwards.
  let crons = $state<Cron[]>(untrack(() => initial ?? []));
  let expression = $state('');
  let error = $state<string | null>(null);
  let busy = $state(false);

  async function add(event: SubmitEvent) {
    event.preventDefault();
    if (!expression.trim()) return;

    busy = true;
    error = null;

    try {
      const updated = await api.post<{ crons?: Cron[] }>(`/api/v1/workers/${workerId}/crons`, {
        expression
      });
      crons = updated.crons ?? crons;
      expression = '';
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to add cron';
    } finally {
      busy = false;
    }
  }

  async function remove(cronId: string) {
    try {
      await api.del(`/api/v1/crons/${cronId}`);
      crons = crons.filter((c) => c.id !== cronId);
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to delete cron';
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

    <form class="flex items-center gap-2" onsubmit={add}>
      <Input class="flex-1 font-mono" placeholder="*/5 * * * *" bind:value={expression} />
      <Button type="submit" disabled={busy}>Add</Button>
    </form>

    {#if error}
      <p class="text-destructive text-sm">{error}</p>
    {/if}
  </Card.Content>
</Card.Root>
