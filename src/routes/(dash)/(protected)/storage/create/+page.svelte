<script lang="ts">
  import { Button } from '#lib/components/ui/button/index.ts';
  import { Input } from '#lib/components/ui/input/index.ts';
  import { Label } from '#lib/components/ui/label/index.ts';
  import * as Card from '#lib/components/ui/card/index.ts';
  import PageHeader from '#lib/components/page-header.svelte';
  import FieldIssues from '#lib/components/field-issues.svelte';
  import ChoiceButton from '#lib/components/choice-button.svelte';
  import { createStorageConfig } from './create.remote.ts';

  let { data } = $props();

  const { fields } = createStorageConfig;
</script>

<PageHeader title="New storage config" />

<div class="max-w-xl p-8">
  <Card.Root>
    <Card.Content class="pt-6">
      <!-- CSS hides the S3 fields while Platform is checked, so the form works without JS -->
      <form class="group flex flex-col gap-4" {...createStorageConfig}>
        <fieldset>
          <legend class="mb-2 text-sm leading-none font-medium">Provider</legend>
          <div class="flex gap-2">
            <ChoiceButton
              input={fields.provider.as('radio', 'platform', data.platformStorage)}
              disabled={!data.platformStorage}
            >
              Platform
            </ChoiceButton>
            <ChoiceButton input={fields.provider.as('radio', 's3', !data.platformStorage)}>S3-compatible</ChoiceButton>
          </div>
          {#if !data.platformStorage}
            <p class="text-muted-foreground mt-2 text-sm">Platform storage is not configured on this platform.</p>
          {/if}
        </fieldset>

        <div class="flex flex-col gap-2">
          <Label for="name">Name</Label>
          <Input id="name" {...fields.name.as('text')} required />
          <FieldIssues issues={fields.name.issues()} />
        </div>

        <div class="flex flex-col gap-2">
          <Label for="desc">Description <span class="text-muted-foreground">(optional)</span></Label>
          <Input id="desc" {...fields.desc.as('text')} />
          <FieldIssues issues={fields.desc.issues()} />
        </div>

        <div class="flex flex-col gap-4 group-has-[input[value=platform]:checked]:hidden">
          <div class="flex flex-col gap-2">
            <Label for="bucket">Bucket</Label>
            <Input id="bucket" {...fields.bucket.as('text')} />
            <FieldIssues issues={fields.bucket.issues()} />
          </div>
          <div class="flex flex-col gap-2">
            <Label for="accessKeyId">Access key ID</Label>
            <Input id="accessKeyId" {...fields.accessKeyId.as('text')} />
            <FieldIssues issues={fields.accessKeyId.issues()} />
          </div>
          <div class="flex flex-col gap-2">
            <Label for="secretAccessKey">Secret access key</Label>
            <Input id="secretAccessKey" {...fields._secretAccessKey.as('password')} />
            <FieldIssues issues={fields._secretAccessKey.issues()} />
          </div>
          <div class="flex flex-col gap-2">
            <Label for="endpoint">Endpoint <span class="text-muted-foreground">(optional)</span></Label>
            <Input id="endpoint" {...fields.endpoint.as('text')} placeholder="https://…" />
            <FieldIssues issues={fields.endpoint.issues()} />
          </div>
          <div class="flex gap-2">
            <div class="flex flex-1 flex-col gap-2">
              <Label for="region">Region</Label>
              <Input id="region" {...fields.region.as('text')} />
              <FieldIssues issues={fields.region.issues()} />
            </div>
            <div class="flex flex-1 flex-col gap-2">
              <Label for="prefix">Prefix</Label>
              <Input id="prefix" {...fields.prefix.as('text')} />
              <FieldIssues issues={fields.prefix.issues()} />
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <Label for="publicUrl">Public URL <span class="text-muted-foreground">(optional)</span></Label>
            <Input id="publicUrl" {...fields.publicUrl.as('text')} />
            <FieldIssues issues={fields.publicUrl.issues()} />
          </div>
        </div>

        <FieldIssues issues={fields.issues()} />

        <div class="flex justify-end">
          <Button type="submit" disabled={!!createStorageConfig.pending}>
            {createStorageConfig.pending ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form>
    </Card.Content>
  </Card.Root>
</div>
