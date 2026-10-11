<script lang="ts">
  import { Button } from '#lib/components/ui/button/index.ts';
  import { Input } from '#lib/components/ui/input/index.ts';
  import { Label } from '#lib/components/ui/label/index.ts';
  import * as Card from '#lib/components/ui/card/index.ts';
  import FieldIssues from '#lib/components/field-issues.svelte';
  import { MASKED_SECRET } from '#lib/types/schemas/storage.schema.ts';
  import { updateStorageS3Settings } from '../storage.remote.ts';

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

  let s3 = $derived(updateStorageS3Settings.for(id));
  let fields = $derived(s3.fields);
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>S3 configuration</Card.Title>
    <Card.Description>Credentials are masked — leave them as-is to keep the current ones.</Card.Description>
  </Card.Header>
  <Card.Content>
    <form class="flex flex-col gap-4" {...s3}>
      <input {...fields.id.as('hidden', id)} />
      <div class="flex flex-col gap-2">
        <Label for="bucket">Bucket</Label>
        <Input id="bucket" {...fields.bucket.as('text', config.bucket ?? '')} required />
        <FieldIssues issues={fields.bucket.issues()} />
      </div>

      <div class="flex gap-2">
        <div class="flex flex-1 flex-col gap-2">
          <Label for="region">Region</Label>
          <Input id="region" {...fields.region.as('text', config.region ?? '')} />
          <FieldIssues issues={fields.region.issues()} />
        </div>
        <div class="flex flex-1 flex-col gap-2">
          <Label for="prefix">Prefix</Label>
          <Input id="prefix" {...fields.prefix.as('text', config.prefix ?? '')} />
          <FieldIssues issues={fields.prefix.issues()} />
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <Label for="endpoint">Endpoint</Label>
        <Input id="endpoint" {...fields.endpoint.as('text', config.endpoint ?? '')} placeholder="https://…" />
        <FieldIssues issues={fields.endpoint.issues()} />
      </div>

      <div class="flex flex-col gap-2">
        <Label for="publicUrl">Public URL</Label>
        <Input id="publicUrl" {...fields.publicUrl.as('text', config.publicUrl ?? '')} />
        <FieldIssues issues={fields.publicUrl.issues()} />
      </div>

      <div class="flex flex-col gap-2">
        <Label for="accessKeyId">Access key ID</Label>
        <Input
          id="accessKeyId"
          {...fields.accessKeyId.as('text', config.accessKeyId ?? MASKED_SECRET)}
          autocomplete="off"
        />
        <FieldIssues issues={fields.accessKeyId.issues()} />
      </div>

      <div class="flex flex-col gap-2">
        <Label for="secretAccessKey">Secret access key</Label>
        <Input
          id="secretAccessKey"
          {...fields._secretAccessKey.as('password', config.secretAccessKey ?? MASKED_SECRET)}
          autocomplete="off"
        />
        <FieldIssues issues={fields._secretAccessKey.issues()} />
      </div>

      <FieldIssues issues={fields.issues()} />
      {#if s3.result?.saved}<p class="text-sm text-green-500">Saved.</p>{/if}

      <div class="flex justify-end">
        <Button type="submit" disabled={!!s3.pending}>{s3.pending ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  </Card.Content>
</Card.Root>
