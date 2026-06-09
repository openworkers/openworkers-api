<script lang="ts">
  import { onMount } from 'svelte';
  import { api, ApiError } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import * as Table from '$lib/components/ui/table';

  let { id }: { id: string } = $props();

  let sql = $state('SELECT 1;');
  let running = $state(false);
  let error = $state<string | null>(null);
  let columns = $state<string[]>([]);
  let rows = $state<Record<string, unknown>[]>([]);
  let tables = $state<string[]>([]);

  async function loadTables() {
    try {
      const res = await api.get<{ name: string }[]>(`/api/v1/databases/${id}/tables`);
      tables = res.map((t) => t.name);
    } catch {
      // tables listing is best-effort
    }
  }

  async function run() {
    running = true;
    error = null;
    columns = [];
    rows = [];

    try {
      const result = await api.post<{ columns?: string[]; rows?: Record<string, unknown>[] }>(
        `/api/v1/databases/${id}/exec`,
        { sql, params: [] }
      );
      rows = result.rows ?? [];
      columns = result.columns ?? (rows[0] ? Object.keys(rows[0]) : []);
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Query failed';
    } finally {
      running = false;
    }
  }

  onMount(loadTables);
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>SQL console</Card.Title>
    {#if tables.length > 0}
      <Card.Description>Tables: {tables.join(', ')}</Card.Description>
    {/if}
  </Card.Header>
  <Card.Content class="flex flex-col gap-3">
    <textarea
      bind:value={sql}
      rows="4"
      spellcheck="false"
      class="border-input bg-background focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 font-mono text-sm outline-none focus-visible:ring-[3px]"
    ></textarea>

    <div class="flex justify-end">
      <Button onclick={run} disabled={running}>{running ? 'Running…' : 'Run'}</Button>
    </div>

    {#if error}
      <p class="text-destructive text-sm">{error}</p>
    {/if}

    {#if rows.length > 0}
      <div class="overflow-auto rounded-md border">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              {#each columns as col (col)}
                <Table.Head>{col}</Table.Head>
              {/each}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each rows as row, i (i)}
              <Table.Row>
                {#each columns as col (col)}
                  <Table.Cell class="font-mono text-xs">{String(row[col] ?? '')}</Table.Cell>
                {/each}
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </div>
    {/if}
  </Card.Content>
</Card.Root>
