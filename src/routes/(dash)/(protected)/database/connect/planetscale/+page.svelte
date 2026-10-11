<script lang="ts">
  import { Button } from '#lib/components/ui/button/index.ts';
  import * as Card from '#lib/components/ui/card/index.ts';
  import PageHeader from '#lib/components/page-header.svelte';
  import FieldIssues from '#lib/components/field-issues.svelte';
  import { connectPlanetScale } from './planetscale.remote.ts';

  let { data } = $props();
</script>

<PageHeader title="Connect PlanetScale" />

<div class="max-w-xl p-8">
  <Card.Root>
    <Card.Header>
      <Card.Title>PlanetScale</Card.Title>
      <Card.Description>Authorize OpenWorkers to provision databases on your PlanetScale account.</Card.Description>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      {#if !data.orgs}
        <form {...connectPlanetScale}>
          <Button type="submit" disabled={!!connectPlanetScale.pending}>Connect PlanetScale account</Button>
        </form>
        <FieldIssues issues={connectPlanetScale.fields.allIssues()} />
        {#if data.note}<p class="text-destructive text-sm">{data.note}</p>{/if}
      {:else}
        <p class="text-sm">Connected. Organizations:</p>
        <ul class="list-inside list-disc text-sm">
          {#each data.orgs as org (org.id)}
            <li>{org.name}</li>
          {/each}
        </ul>
        <p class="text-muted-foreground text-xs">
          Database/branch selection &amp; provisioning is not fully ported yet.
        </p>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
