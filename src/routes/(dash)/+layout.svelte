<script lang="ts">
  import '../../app.css';
  import { onMount } from 'svelte';
  import { initTheme } from '$lib/theme.svelte';

  let { children } = $props();

  // Sync the reactive store with the theme the inline script already applied.
  onMount(initTheme);
</script>

<div class="bg-background text-foreground min-h-screen">
  {@render children?.()}
</div>
