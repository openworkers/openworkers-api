<script lang="ts">
  import { untrack } from 'svelte';
  import { api, ApiError } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Card from '$lib/components/ui/card';

  const MASKED = '********';

  type Config = {
    bucket?: string;
    prefix?: string | null;
    accessKeyId?: string;
    secretAccessKey?: string;
    endpoint?: string | null;
    region?: string | null;
    publicUrl?: string | null;
  };

  let { id, config }: { id: string; config: Config } = $props();

  // One-time snapshot to seed the form (the inputs are mutated locally after).
  const init = untrack(() => config);

  let bucket = $state(init.bucket ?? '');
  let prefix = $state(init.prefix ?? '');
  let endpoint = $state(init.endpoint ?? '');
  let region = $state(init.region ?? '');
  let publicUrl = $state(init.publicUrl ?? '');
  let accessKeyId = $state(init.accessKeyId ?? MASKED);
  let secretAccessKey = $state(init.secretAccessKey ?? MASKED);

  let saving = $state(false);
  let error = $state<string | null>(null);
  let saved = $state(false);

  async function save(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    error = null;
    saved = false;

    const payload: Record<string, unknown> = {
      bucket,
      prefix: prefix || null,
      endpoint: endpoint || null,
      region: region || null,
      publicUrl: publicUrl || null
    };

    // Rotate credentials only if the user actually changed them — a still-masked
    // field means "keep the current secret".
    if (accessKeyId && accessKeyId !== MASKED) payload.accessKeyId = accessKeyId;
    if (secretAccessKey && secretAccessKey !== MASKED) payload.secretAccessKey = secretAccessKey;

    try {
      await api.patch(`/api/v1/storage/${id}`, payload);
      saved = true;
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to save';
    } finally {
      saving = false;
    }
  }
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>S3 configuration</Card.Title>
    <Card.Description>Credentials are masked — leave them as-is to keep the current ones.</Card.Description>
  </Card.Header>
  <Card.Content>
    <form class="flex flex-col gap-4" onsubmit={save}>
      <div class="flex flex-col gap-2">
        <Label for="bucket">Bucket</Label>
        <Input id="bucket" bind:value={bucket} required />
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
        <Label for="endpoint">Endpoint</Label>
        <Input id="endpoint" bind:value={endpoint} placeholder="https://…" />
      </div>

      <div class="flex flex-col gap-2">
        <Label for="publicUrl">Public URL</Label>
        <Input id="publicUrl" bind:value={publicUrl} />
      </div>

      <div class="flex flex-col gap-2">
        <Label for="accessKeyId">Access key ID</Label>
        <Input id="accessKeyId" bind:value={accessKeyId} autocomplete="off" />
      </div>

      <div class="flex flex-col gap-2">
        <Label for="secretAccessKey">Secret access key</Label>
        <Input id="secretAccessKey" type="password" bind:value={secretAccessKey} autocomplete="off" />
      </div>

      {#if error}<p class="text-destructive text-sm">{error}</p>{/if}
      {#if saved}<p class="text-sm text-green-500">Saved.</p>{/if}

      <div class="flex justify-end">
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  </Card.Content>
</Card.Root>
