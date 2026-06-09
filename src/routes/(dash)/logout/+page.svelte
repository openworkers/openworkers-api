<script lang="ts">
  // This route exists for its POST form action (logout). A direct GET just
  // bounces to sign-in.
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => goto('/sign-in'));
</script>

<p class="text-muted-foreground p-8 text-sm">Signing out…</p>
