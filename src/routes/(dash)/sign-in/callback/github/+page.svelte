<script lang="ts">
  let { data } = $props();
</script>

<svelte:head><title>Signing in… · OpenWorkers</title></svelte:head>

<main class="flex min-h-screen items-center justify-center p-6 text-center">
  {#if data.error}
    <div>
      <p class="text-destructive text-sm">{data.error}</p>
      <a href="/sign-in" class="text-muted-foreground mt-2 inline-block text-sm hover:underline">
        Back to sign in
      </a>
    </div>
  {:else}
    <p class="text-muted-foreground text-sm">Completing GitHub sign-in…</p>
  {/if}
</main>
