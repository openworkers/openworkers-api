<script lang="ts">
  import { refreshAll } from '$app/navigation';
  import { remoteErrorMessage } from '#lib/remote-errors.ts';
  import { Button } from '#lib/components/ui/button/index.ts';
  import { Input } from '#lib/components/ui/input/index.ts';
  import * as Card from '#lib/components/ui/card/index.ts';
  import * as Table from '#lib/components/ui/table/index.ts';
  import FieldIssues from '#lib/components/field-issues.svelte';
  import { Trash2 } from '@lucide/svelte';
  import { deleteKvEntry, putKvEntry } from '../kv.remote.ts';

  let { id, keys }: { id: string; keys: string[] } = $props();

  let put = $derived(putKvEntry.for(id));
  let error = $state<string | null>(null);

  async function remove(key: string) {
    error = null;

    try {
      await deleteKvEntry({ namespaceId: id, key });
      await refreshAll();
    } catch (e) {
      error = remoteErrorMessage(e, 'Failed to delete key');
    }
  }
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Data</Card.Title>
    <Card.Description>Browse and edit entries (first 100 keys).</Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-4">
    <form class="flex items-end gap-2" {...put}>
      <input {...put.fields.namespaceId.as('hidden', id)} />
      <Input class="flex-1" placeholder="key" {...put.fields.key.as('text')} required />
      <Input class="flex-1" placeholder="value" {...put.fields.value.as('text')} />
      <Button type="submit" disabled={!!put.pending}>Set</Button>
    </form>

    <FieldIssues issues={put.fields.allIssues()} />
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
