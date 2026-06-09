<script lang="ts">
  import { onMount } from 'svelte';
  import { api, ApiError } from '$lib/api';
  import type { IApiKey, IApiKeyCreateResponse } from '$lib/types';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Card from '$lib/components/ui/card';
  import * as Table from '$lib/components/ui/table';
  import PageHeader from '$lib/components/page-header.svelte';
  import { auth } from '$lib/auth.svelte';
  import { Trash2 } from '@lucide/svelte';

  let keys = $state<IApiKey[]>([]);
  let newKeyName = $state('');
  let createdToken = $state<string | null>(null);
  let error = $state<string | null>(null);
  let creating = $state(false);

  async function loadKeys() {
    try {
      keys = await api.get<IApiKey[]>('/api/v1/api-keys');
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to load API keys';
    }
  }

  async function createKey(event: SubmitEvent) {
    event.preventDefault();
    if (!newKeyName.trim()) return;

    creating = true;
    error = null;

    try {
      const res = await api.post<IApiKeyCreateResponse>('/api/v1/api-keys', { name: newKeyName });
      createdToken = res.token;
      newKeyName = '';
      await loadKeys();
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to create key';
    } finally {
      creating = false;
    }
  }

  async function removeKey(id: string, name: string) {
    if (!confirm(`Revoke API key "${name}"?`)) return;

    try {
      await api.del(`/api/v1/api-keys/${id}`);
      keys = keys.filter((k) => k.id !== id);
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to revoke key';
    }
  }

  onMount(loadKeys);
</script>

<PageHeader title="Account" description="Your profile and API keys." />

<div class="flex max-w-3xl flex-col gap-6 p-8">
  <Card.Root>
    <Card.Header>
      <Card.Title>Profile</Card.Title>
    </Card.Header>
    <Card.Content class="flex items-center justify-between">
      <div>
        <p class="font-medium">{auth.profile?.username ?? '—'}</p>
        <p class="text-muted-foreground text-sm">{auth.profile?.id ?? ''}</p>
      </div>
      <form method="POST" action="/logout">
        <Button type="submit" variant="outline">Sign out</Button>
      </form>
    </Card.Content>
  </Card.Root>

  <Card.Root>
    <Card.Header>
      <Card.Title>API keys</Card.Title>
      <Card.Description>Use these to authenticate the CLI and CI.</Card.Description>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      {#if createdToken}
        <div class="bg-muted rounded-md border p-3">
          <p class="text-sm font-medium">Copy your new token now — it won't be shown again:</p>
          <code class="mt-2 block break-all text-xs">{createdToken}</code>
        </div>
      {/if}

      <form class="flex items-end gap-2" onsubmit={createKey}>
        <div class="flex flex-1 flex-col gap-2">
          <Label for="keyname">New key name</Label>
          <Input id="keyname" bind:value={newKeyName} placeholder="ci-deploy" />
        </div>
        <Button type="submit" disabled={creating}>Create</Button>
      </form>

      {#if error}
        <p class="text-destructive text-sm">{error}</p>
      {/if}

      {#if keys.length > 0}
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Name</Table.Head>
              <Table.Head>Prefix</Table.Head>
              <Table.Head class="w-12"></Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each keys as key (key.id)}
              <Table.Row>
                <Table.Cell class="font-medium">{key.name}</Table.Cell>
                <Table.Cell class="text-muted-foreground font-mono text-xs">
                  {key.tokenPrefix}…
                </Table.Cell>
                <Table.Cell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onclick={() => removeKey(key.id, key.name)}
                    aria-label="Revoke"
                  >
                    <Trash2 class="size-4" />
                  </Button>
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
