<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    description,
    section,
    actions
  }: {
    title: string;
    description?: string;
    // Added to the tab title only, e.g. `Logs` for a worker's logs page.
    section?: string;
    actions?: Snippet;
  } = $props();
</script>

<svelte:head>
  <title>{[title, section, 'OpenWorkers'].filter(Boolean).join(' · ')}</title>
</svelte:head>

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
