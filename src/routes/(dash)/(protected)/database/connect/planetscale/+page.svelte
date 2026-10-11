<script lang="ts">
  import { Button } from '#lib/components/ui/button/index.ts';
  import { Input } from '#lib/components/ui/input/index.ts';
  import { Label } from '#lib/components/ui/label/index.ts';
  import * as Card from '#lib/components/ui/card/index.ts';
  import PageHeader from '#lib/components/page-header.svelte';
  import FieldIssues from '#lib/components/field-issues.svelte';
  import { ChevronRight } from '@lucide/svelte';
  import { connectPlanetScale, createPlanetScaleDatabase } from './planetscale.remote.ts';

  let { data } = $props();

  const { fields } = createPlanetScaleDatabase;

  function stepHref(params: Record<string, string>): string {
    return `?${new URLSearchParams(params)}`;
  }

  let title = $derived(
    !data.org ? 'Organization' : !data.database ? 'Database' : !data.branch ? 'Branch' : 'New database'
  );

  let nextParams = $derived((item: string): Record<string, string> => {
    if (!data.org) return { org: item };
    if (!data.database) return { org: data.org, database: item };
    return { org: data.org, database: data.database!, branch: item };
  });
</script>

<PageHeader title="Connect PlanetScale" />

<div class="max-w-xl p-8">
  <Card.Root>
    <Card.Header>
      <Card.Title>PlanetScale</Card.Title>
      <Card.Description>Use a branch of a PlanetScale database from your workers.</Card.Description>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      {#if !data.connected}
        <form {...connectPlanetScale}>
          <Button type="submit" disabled={!!connectPlanetScale.pending}>Connect PlanetScale account</Button>
        </form>
        <FieldIssues issues={connectPlanetScale.fields.allIssues()} />
        {#if data.note}<p class="text-destructive text-sm">{data.note}</p>{/if}
      {:else}
        <nav class="text-muted-foreground flex flex-wrap items-center gap-1 text-sm" aria-label="Selection">
          <a href="?" class="hover:underline">Organizations</a>
          {#if data.org}
            <ChevronRight class="size-3" />
            <a href={stepHref({ org: data.org })} class="hover:underline">{data.org}</a>
          {/if}
          {#if data.org && data.database}
            <ChevronRight class="size-3" />
            <a href={stepHref({ org: data.org, database: data.database })} class="hover:underline">{data.database}</a>
          {/if}
          {#if data.branch}
            <ChevronRight class="size-3" />
            <span class="text-foreground">{data.branch}</span>
          {/if}
        </nav>

        {#if data.note}<p class="text-destructive text-sm">{data.note}</p>{/if}

        {#if data.org && data.database && data.branch}
          <form class="flex flex-col gap-4" {...createPlanetScaleDatabase}>
            <input {...fields.org.as('hidden', data.org)} />
            <input {...fields.database.as('hidden', data.database)} />
            <input {...fields.branch.as('hidden', data.branch)} />

            <div class="flex flex-col gap-2">
              <Label for="name">Name</Label>
              <Input id="name" {...fields.name.as('text', `${data.database}-${data.branch}`)} required />
              <FieldIssues issues={fields.name.issues()} />
            </div>

            <div class="flex flex-col gap-2">
              <Label for="desc">Description <span class="text-muted-foreground">(optional)</span></Label>
              <Input id="desc" {...fields.desc.as('text')} />
            </div>

            <div class="flex flex-col gap-2">
              <Label for="dbName">Postgres database</Label>
              <Input id="dbName" {...fields.dbName.as('text', 'postgres')} required />
              <FieldIssues issues={fields.dbName.issues()} />
            </div>

            <FieldIssues issues={fields.issues()} />

            <div class="flex justify-end">
              <Button type="submit" disabled={!!createPlanetScaleDatabase.pending}>
                {createPlanetScaleDatabase.pending ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </form>
        {:else}
          <div class="flex flex-col gap-1">
            <p class="text-sm font-medium">{title}</p>
            {#each data.items as item (item.id)}
              <a
                href={stepHref(nextParams(item.name))}
                class="hover:bg-muted flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                {item.name}
                <ChevronRight class="text-muted-foreground size-4" />
              </a>
            {:else}
              {#if !data.note}<p class="text-muted-foreground text-sm">Nothing here.</p>{/if}
            {/each}
          </div>
        {/if}
      {/if}
    </Card.Content>
  </Card.Root>
</div>
