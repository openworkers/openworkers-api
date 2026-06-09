<script lang="ts">
  import { onMount } from 'svelte';
  import { api, ApiError } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import * as Card from '$lib/components/ui/card';
  import * as Table from '$lib/components/ui/table';
  import { Trash2 } from '@lucide/svelte';

  let { id }: { id: string } = $props();

  let keys = $state<string[]>([]);
  let newKey = $state('');
  let newValue = $state('');
  let error = $state<string | null>(null);
  let busy = $state(false);

  // The list endpoint returns an implementation-defined shape; normalise the
  // common cases (array of strings, array of { key }, or { keys } / { items }).
  function extractKeys(result: unknown): string[] {
    const arr = Array.isArray(result)
      ? result
      : ((result as { keys?: unknown[]; items?: unknown[] })?.keys ??
        (result as { items?: unknown[] })?.items ??
        []);

    return (arr as unknown[]).map((entry) =>
      typeof entry === 'string' ? entry : ((entry as { key?: string })?.key ?? String(entry))
    );
  }

  async function load() {
    try {
      keys = extractKeys(await api.get(`/api/v1/kv/${id}/data?limit=100`));
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to load keys';
    }
  }

  async function put(event: SubmitEvent) {
    event.preventDefault();
    if (!newKey.trim()) return;

    busy = true;
    error = null;

    try {
      await api.put(`/api/v1/kv/${id}/data/${encodeURIComponent(newKey)}`, { value: newValue });
      newKey = '';
      newValue = '';
      await load();
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to set key';
    } finally {
      busy = false;
    }
  }

  async function remove(key: string) {
    try {
      await api.del(`/api/v1/kv/${id}/data/${encodeURIComponent(key)}`);
      keys = keys.filter((k) => k !== key);
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to delete key';
    }
  }

  onMount(load);
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Data</Card.Title>
    <Card.Description>Browse and edit entries (first 100 keys).</Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-4">
    <form class="flex items-end gap-2" onsubmit={put}>
      <Input class="flex-1" placeholder="key" bind:value={newKey} />
      <Input class="flex-1" placeholder="value" bind:value={newValue} />
      <Button type="submit" disabled={busy}>Set</Button>
    </form>

    {#if error}
      <p class="text-destructive text-sm">{error}</p>
    {/if}

    {#if keys.length > 0}
      <Table.Root>
        <Table.Body>
          {#each keys as key (key)}
            <Table.Row>
              <Table.Cell class="font-mono text-xs">{key}</Table.Cell>
              <Table.Cell class="w-12">
                <Button variant="ghost" size="icon-sm" onclick={() => remove(key)} aria-label="Delete">
                  <Trash2 class="size-4" />
                </Button>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    {:else}
      <p class="text-muted-foreground text-sm">No keys.</p>
    {/if}
  </Card.Content>
</Card.Root>
