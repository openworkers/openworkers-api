<script lang="ts">
  import * as Card from '#lib/components/ui/card/index.ts';

  type Usage = {
    environmentId: string;
    environmentName: string;
    key: string;
    workers: { id: string; name: string }[];
  };

  let { usages }: { usages: Usage[] } = $props();
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Used by</Card.Title>
    <Card.Description>The environments that bind this resource, and their workers.</Card.Description>
  </Card.Header>
  <Card.Content>
    {#if usages.length === 0}
      <p class="text-muted-foreground text-sm">
        No environment binds this resource. Bind it in an environment, then choose that environment on a worker.
      </p>
    {:else}
      <ul class="flex flex-col gap-3">
        {#each usages as usage (usage.environmentId + usage.key)}
          <li class="flex flex-col gap-1">
            <div class="text-sm">
              <a href={`/environment/${usage.environmentId}`} class="font-medium hover:underline">
                {usage.environmentName}
              </a>
              <span class="text-muted-foreground">as</span>
              <code class="font-mono">{usage.key}</code>
            </div>
            {#if usage.workers.length > 0}
              <div class="flex flex-wrap gap-x-3 gap-y-1 pl-4 text-sm">
                {#each usage.workers as worker (worker.id)}
                  <a href={`/worker/${worker.id}`} class="hover:underline">{worker.name}</a>
                {/each}
              </div>
            {:else}
              <p class="text-muted-foreground pl-4 text-sm">No worker uses this environment.</p>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </Card.Content>
</Card.Root>
