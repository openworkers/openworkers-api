<script lang="ts">
  import { Button } from '#lib/components/ui/button/index.ts';
  import { Textarea } from '#lib/components/ui/textarea/index.ts';
  import * as Card from '#lib/components/ui/card/index.ts';
  import * as Table from '#lib/components/ui/table/index.ts';
  import FieldIssues from '#lib/components/field-issues.svelte';
  import { runD1Statement } from '../d1.remote.ts';

  let { id }: { id: string } = $props();

  let run = $derived(runD1Statement.for(id));
  let result = $derived(run.result);

  // The prefix a worker sees for this error kind (openworkers-core docs/d1.md, "Errors")
  function errorPrefix(kind: string): string {
    if (kind === 'type') return 'D1_TYPE_ERROR';
    if (kind === 'range') return 'D1_RANGE_ERROR';
    return 'D1_ERROR';
  }

  function cell(value: unknown): string {
    if (value === null) return 'NULL';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>SQL</Card.Title>
    <Card.Description>Runs one statement on the database through the runner.</Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-4">
    <form class="flex flex-col gap-2" {...run}>
      <input {...run.fields.databaseId.as('hidden', id)} />
      <Textarea
        {...run.fields.sql.as('text')}
        rows={4}
        class="font-mono"
        placeholder="SELECT name FROM sqlite_master WHERE type = 'table'"
        required
      />
      <FieldIssues issues={run.fields.allIssues()} />
      <div class="flex justify-end">
        <Button type="submit" disabled={!!run.pending}>{run.pending ? 'Running…' : 'Run'}</Button>
      </div>
    </form>

    {#if result?.type === 'error' && 'message' in result}
      <p class="text-destructive font-mono text-sm">{errorPrefix(result.kind)}: {result.message}</p>
    {:else if result?.type === 'query' && 'rows' in result}
      {#if result.columns.length > 0}
        <div class="overflow-x-auto rounded-md border">
          <Table.Root>
            <Table.Header>
              <Table.Row>
                {#each result.columns as column, i (i)}
                  <Table.Head class="font-mono text-xs">{column}</Table.Head>
                {/each}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each result.rows as row, r (r)}
                <Table.Row>
                  {#each row as value, c (c)}
                    <Table.Cell class="font-mono text-xs">{cell(value)}</Table.Cell>
                  {/each}
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </div>
      {/if}
      <p class="text-muted-foreground text-xs">
        {result.rows.length} rows, {result.meta?.changes ?? 0} changes
      </p>
    {/if}
  </Card.Content>
</Card.Root>
