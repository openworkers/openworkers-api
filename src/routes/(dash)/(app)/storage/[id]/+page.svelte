<script lang="ts">
  import { page } from '$app/state';
  import ResourceDetail from '$lib/components/resource-detail.svelte';
  import * as Card from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';

  let id = $derived(page.params.id!);

  type Storage = { provider?: string; bucket?: string; region?: string | null; endpoint?: string | null };
</script>

{#key id}
  <ResourceDetail base="storage" {id} listHref="/storage-configs">
    {#snippet extra(item)}
      {@const s = item as Storage}
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            Provider
            <Badge variant="secondary">{s.provider ?? 'platform'}</Badge>
          </Card.Title>
        </Card.Header>
        {#if s.provider === 's3'}
          <Card.Content class="text-sm">
            <dl class="grid grid-cols-[8rem_1fr] gap-y-1">
              <dt class="text-muted-foreground">Bucket</dt>
              <dd class="font-mono">{s.bucket ?? '—'}</dd>
              <dt class="text-muted-foreground">Region</dt>
              <dd class="font-mono">{s.region ?? '—'}</dd>
              <dt class="text-muted-foreground">Endpoint</dt>
              <dd class="font-mono break-all">{s.endpoint ?? '—'}</dd>
            </dl>
            <p class="text-muted-foreground mt-3 text-xs">
              Credentials are masked. Editing S3 credentials is not yet ported.
            </p>
          </Card.Content>
        {/if}
      </Card.Root>
    {/snippet}
  </ResourceDetail>
{/key}
