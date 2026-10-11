<script lang="ts">
  import { refreshAll } from '$app/navigation';
  import { api, ApiError } from '#lib/api.ts';
  import { Button } from '#lib/components/ui/button/index.ts';
  import { Input } from '#lib/components/ui/input/index.ts';
  import * as Card from '#lib/components/ui/card/index.ts';
  import { Trash2 } from '@lucide/svelte';
  import { hydration } from '#lib/hydration.svelte.ts';

  type Cron = { id: string; value: string; nextRun?: string | Date | null };

  let { workerId, crons }: { workerId: string; crons: Cron[] } = $props();

  let expression = $state('');
  let error = $state<string | null>(null);
  let busy = $state(false);

  async function add(event: SubmitEvent) {
    event.preventDefault();
    if (!expression.trim()) return;

    busy = true;
    error = null;

    try {
      await api.post(`/api/v1/workers/${workerId}/crons`, { expression });
      expression = '';
      await refreshAll();
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to add cron';
    } finally {
      busy = false;
    }
  }

  async function remove(cronId: string) {
    try {
      await api.del(`/api/v1/crons/${cronId}`);
      await refreshAll();
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
      <fieldset class="contents" disabled={!hydration.done}>
        <Input class="flex-1 font-mono" placeholder="*/5 * * * *" bind:value={expression} />
        <Button type="submit" disabled={busy}>Add</Button>
      </fieldset>
    </form>

    {#if error}
      <p class="text-destructive text-sm">{error}</p>
    {/if}
  </Card.Content>
</Card.Root>
