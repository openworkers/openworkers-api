<script lang="ts">
  import { onMount } from 'svelte';
  import { api, ApiError } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import PageHeader from '$lib/components/page-header.svelte';

  type Org = { id: string; name: string };

  let orgs = $state<Org[]>([]);
  let connected = $state(false);
  let loading = $state(true);
  let note = $state<string | null>(null);

  async function probe() {
    try {
      orgs = await api.get<Org[]>('/api/v1/planetscale/organizations');
      connected = true;
    } catch (e) {
      // Not connected yet (or token expired) — offer the OAuth handshake.
      connected = false;
      note = e instanceof ApiError && e.status !== 401 ? e.message : null;
    } finally {
      loading = false;
    }
  }

  function connect() {
    // Kick off the PlanetScale OAuth handshake handled by the API.
    window.location.href = '/api/v1/openid/planetscale';
  }

  onMount(probe);
</script>

<PageHeader title="Connect PlanetScale" />

<div class="max-w-xl p-8">
  <Card.Root>
    <Card.Header>
      <Card.Title>PlanetScale</Card.Title>
      <Card.Description>
        Authorize OpenWorkers to provision databases on your PlanetScale account.
      </Card.Description>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      {#if loading}
        <p class="text-muted-foreground text-sm">Checking connection…</p>
      {:else if !connected}
        <Button onclick={connect}>Connect PlanetScale account</Button>
        {#if note}<p class="text-destructive text-sm">{note}</p>{/if}
      {:else}
        <p class="text-sm">Connected. Organizations:</p>
        <ul class="list-inside list-disc text-sm">
          {#each orgs as org (org.id)}
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
