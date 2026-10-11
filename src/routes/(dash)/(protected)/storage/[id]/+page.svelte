<script lang="ts">
  import { page } from '$app/state';
  import ResourceDetail from '#lib/components/resource-detail.svelte';
  import { deleteStorageConfig, updateStorageConfig } from '../storage.remote.ts';
  import ResourceUsages from '#lib/components/resource-usages.svelte';
  import StorageS3Settings from './storage-s3-settings.svelte';
  import StorageFiles from './storage-files.svelte';
  import { Badge } from '#lib/components/ui/badge/index.ts';

  let { data } = $props();
  let id = $derived(page.params.id!);

  type Storage = {
    provider?: string;
    bucket?: string;
    prefix?: string | null;
    accessKeyId?: string;
    secretAccessKey?: string;
    endpoint?: string | null;
    region?: string | null;
    publicUrl?: string | null;
  };
</script>

{#key id}
  <ResourceDetail
    {id}
    update={updateStorageConfig}
    remove={deleteStorageConfig}
    listHref="/storage-configs"
    item={data.item}
  >
    {#snippet extra(item)}
      {@const s = item as Storage}
      <div class="flex items-center gap-2">
        <span class="text-muted-foreground text-sm">Provider</span>
        <Badge variant="secondary">{s.provider ?? 'platform'}</Badge>
      </div>

      {#if s.provider === 's3'}
        <StorageS3Settings {id} config={s} />
      {/if}
      <ResourceUsages usages={data.usages} />
      <StorageFiles {id} prefix={data.prefix} files={data.files} cursor={data.cursor} filesError={data.filesError} />
    {/snippet}
  </ResourceDetail>
{/key}
