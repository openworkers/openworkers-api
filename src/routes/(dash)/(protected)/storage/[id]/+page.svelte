<script lang="ts">
  import { page } from '$app/state';
  import ResourceDetail from '$lib/components/resource-detail.svelte';
  import StorageS3Settings from '$lib/components/storage-s3-settings.svelte';
  import { Badge } from '$lib/components/ui/badge';

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
  <ResourceDetail base="storage" {id} listHref="/storage-configs" initialItem={data.item}>
    {#snippet extra(item)}
      {@const s = item as Storage}
      <div class="flex items-center gap-2">
        <span class="text-muted-foreground text-sm">Provider</span>
        <Badge variant="secondary">{s.provider ?? 'platform'}</Badge>
      </div>

      {#if s.provider === 's3'}
        <StorageS3Settings {id} config={s} />
      {/if}
    {/snippet}
  </ResourceDetail>
{/key}
