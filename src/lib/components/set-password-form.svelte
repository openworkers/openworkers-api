<script lang="ts">
  import { page } from '$app/state';
  import { api, ApiError } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Card from '$lib/components/ui/card';

  let { endpoint, title, cta }: { endpoint: string; title: string; cta: string } = $props();

  let token = $derived(page.url.searchParams.get('token') ?? '');
  let password = $state('');
  let confirm = $state('');
  let loading = $state(false);
  let error = $state<string | null>(null);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    error = null;

    if (!token) {
      error = 'Missing or invalid token.';
      return;
    }

    if (password !== confirm) {
      error = 'Passwords do not match.';
      return;
    }

    loading = true;

    try {
      await api.post(endpoint, { token, password });
      // On success the API sets the session cookie; land in the dashboard.
      window.location.href = '/workers';
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Request failed';
      loading = false;
    }
  }
</script>

<svelte:head><title>{title} · OpenWorkers</title></svelte:head>

<main class="flex min-h-screen items-center justify-center p-6">
  <Card.Root class="w-full max-w-sm">
    <Card.Header class="text-center">
      <Card.Title class="text-xl">{title}</Card.Title>
    </Card.Header>
    <Card.Content>
      <form class="flex flex-col gap-4" onsubmit={submit}>
        <div class="flex flex-col gap-2">
          <Label for="password">New password</Label>
          <Input id="password" type="password" bind:value={password} autocomplete="new-password" required />
        </div>
        <div class="flex flex-col gap-2">
          <Label for="confirm">Confirm password</Label>
          <Input id="confirm" type="password" bind:value={confirm} autocomplete="new-password" required />
        </div>

        {#if error}<p class="text-destructive text-sm">{error}</p>{/if}

        <Button type="submit" disabled={loading}>{loading ? 'Saving…' : cta}</Button>
      </form>
    </Card.Content>
  </Card.Root>
</main>
