<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    description,
    actions
  }: { title: string; description?: string; actions?: Snippet } = $props();
</script>

<header class="flex items-center justify-between gap-4 border-b px-8 py-5">
  <div>
    <h1 class="text-xl font-semibold tracking-tight">{title}</h1>
    {#if description}
      <p class="text-muted-foreground mt-0.5 text-sm">{description}</p>
    {/if}
  </div>

  {#if actions}
    <div class="flex items-center gap-2">
      {@render actions()}
    </div>
  {/if}
</header>
