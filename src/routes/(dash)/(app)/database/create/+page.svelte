<script lang="ts">
  import { goto } from '$app/navigation';
  import { api, ApiError } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Card from '$lib/components/ui/card';
  import PageHeader from '$lib/components/page-header.svelte';

  let provider = $state<'platform' | 'postgres'>('platform');
  let name = $state('');
  let desc = $state('');
  let connectionString = $state('');

  let saving = $state(false);
  let error = $state<string | null>(null);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    error = null;

    const body =
      provider === 'platform'
        ? { provider, name, desc: desc || undefined }
        : { provider, name, desc: desc || undefined, connectionString };

    try {
      const created = await api.post<{ id: string }>('/api/v1/databases', body);
      await goto(`/database/${created.id}`);
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to create';
      saving = false;
    }
  }
</script>

<PageHeader title="New database" />

<div class="max-w-xl p-8">
  <Card.Root>
    <Card.Content class="pt-6">
      <form class="flex flex-col gap-4" onsubmit={submit}>
        <div class="flex flex-col gap-2">
          <Label>Provider</Label>
          <div class="flex gap-2">
            <Button
              type="button"
              variant={provider === 'platform' ? 'default' : 'outline'}
              onclick={() => (provider = 'platform')}
            >
              Platform
            </Button>
            <Button
              type="button"
              variant={provider === 'postgres' ? 'default' : 'outline'}
              onclick={() => (provider = 'postgres')}
            >
              Postgres
            </Button>
            <Button type="button" variant="outline" href="/database/connect/planetscale">
              PlanetScale…
            </Button>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <Label for="name">Name</Label>
          <Input id="name" bind:value={name} required />
        </div>

        <div class="flex flex-col gap-2">
          <Label for="desc">Description <span class="text-muted-foreground">(optional)</span></Label>
          <Input id="desc" bind:value={desc} />
        </div>

        {#if provider === 'postgres'}
          <div class="flex flex-col gap-2">
            <Label for="cs">Connection string</Label>
            <Input id="cs" type="password" bind:value={connectionString} placeholder="postgres://…" required />
          </div>
        {/if}

        {#if error}
          <p class="text-destructive text-sm">{error}</p>
        {/if}

        <div class="flex justify-end">
          <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create'}</Button>
        </div>
      </form>
    </Card.Content>
  </Card.Root>
</div>
