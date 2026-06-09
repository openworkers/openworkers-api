<script lang="ts">
  import { goto } from '$app/navigation';
  import { api, ApiError } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Card from '$lib/components/ui/card';
  import PageHeader from '$lib/components/page-header.svelte';

  let provider = $state<'platform' | 's3'>('platform');
  let name = $state('');
  let desc = $state('');
  // S3 fields
  let bucket = $state('');
  let accessKeyId = $state('');
  let secretAccessKey = $state('');
  let endpoint = $state('');
  let region = $state('');
  let prefix = $state('');
  let publicUrl = $state('');

  let saving = $state(false);
  let error = $state<string | null>(null);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    error = null;

    const body =
      provider === 'platform'
        ? { provider, name, desc: desc || undefined }
        : {
            provider,
            name,
            desc: desc || undefined,
            bucket,
            accessKeyId,
            secretAccessKey,
            endpoint: endpoint || undefined,
            region: region || undefined,
            prefix: prefix || undefined,
            publicUrl: publicUrl || undefined
          };

    try {
      const created = await api.post<{ id: string }>('/api/v1/storage', body);
      await goto(`/storage/${created.id}`);
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to create';
      saving = false;
    }
  }
</script>

<PageHeader title="New storage config" />

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
              variant={provider === 's3' ? 'default' : 'outline'}
              onclick={() => (provider = 's3')}
            >
              S3-compatible
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

        {#if provider === 's3'}
          <div class="flex flex-col gap-2">
            <Label for="bucket">Bucket</Label>
            <Input id="bucket" bind:value={bucket} required />
          </div>
          <div class="flex flex-col gap-2">
            <Label for="accessKeyId">Access key ID</Label>
            <Input id="accessKeyId" bind:value={accessKeyId} required />
          </div>
          <div class="flex flex-col gap-2">
            <Label for="secretAccessKey">Secret access key</Label>
            <Input id="secretAccessKey" type="password" bind:value={secretAccessKey} required />
          </div>
          <div class="flex flex-col gap-2">
            <Label for="endpoint">Endpoint <span class="text-muted-foreground">(optional)</span></Label>
            <Input id="endpoint" bind:value={endpoint} placeholder="https://…" />
          </div>
          <div class="flex gap-2">
            <div class="flex flex-1 flex-col gap-2">
              <Label for="region">Region</Label>
              <Input id="region" bind:value={region} />
            </div>
            <div class="flex flex-1 flex-col gap-2">
              <Label for="prefix">Prefix</Label>
              <Input id="prefix" bind:value={prefix} />
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <Label for="publicUrl">Public URL <span class="text-muted-foreground">(optional)</span></Label>
            <Input id="publicUrl" bind:value={publicUrl} />
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
