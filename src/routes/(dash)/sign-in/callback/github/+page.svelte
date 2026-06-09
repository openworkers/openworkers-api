<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';

  let error = $state<string | null>(null);

  onMount(async () => {
    const code = page.url.searchParams.get('code');

    if (!code) {
      error = 'Missing authorization code.';
      return;
    }

    // The API exchanges the code and sets the session cookie.
    const res = await fetch(`/api/v1/callback/github?code=${encodeURIComponent(code)}`);

    if (res.ok) {
      window.location.href = '/workers';
    } else {
      error = 'GitHub sign-in failed.';
    }
  });
</script>

<svelte:head><title>Signing in… · OpenWorkers</title></svelte:head>

<main class="flex min-h-screen items-center justify-center p-6 text-center">
  {#if error}
    <div>
      <p class="text-destructive text-sm">{error}</p>
      <a href="/sign-in" class="text-muted-foreground mt-2 inline-block text-sm hover:underline">
        Back to sign in
      </a>
    </div>
  {:else}
    <p class="text-muted-foreground text-sm">Completing GitHub sign-in…</p>
  {/if}
</main>
