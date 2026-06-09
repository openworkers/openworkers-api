<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Card from '$lib/components/ui/card';

  let { title, cta, form }: { title: string; cta: string; form: { error?: string } | null } = $props();

  let token = $derived(page.url.searchParams.get('token') ?? '');
  let password = $state('');
  let confirm = $state('');
  let loading = $state(false);
  let clientError = $state<string | null>(null);

  function submit({ cancel }: { cancel: () => void }) {
    clientError = null;

    if (password !== confirm) {
      clientError = 'Passwords do not match.';
      cancel();
      return;
    }

    loading = true;
    return async ({ update }: { update: () => Promise<void> }) => {
      await update();
      loading = false;
    };
  }
</script>

<svelte:head><title>{title} · OpenWorkers</title></svelte:head>

<main class="flex min-h-screen items-center justify-center p-6">
  <Card.Root class="w-full max-w-sm">
    <Card.Header class="text-center">
      <Card.Title class="text-xl">{title}</Card.Title>
    </Card.Header>
    <Card.Content>
      <form method="POST" use:enhance={submit} class="flex flex-col gap-4">
        <input type="hidden" name="token" value={token} />

        <div class="flex flex-col gap-2">
          <Label for="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            bind:value={password}
            autocomplete="new-password"
            required
          />
        </div>

        <div class="flex flex-col gap-2">
          <Label for="confirm">Confirm password</Label>
          <Input id="confirm" type="password" bind:value={confirm} autocomplete="new-password" required />
        </div>

        {#if clientError}<p class="text-destructive text-sm">{clientError}</p>{/if}
        {#if form?.error}<p class="text-destructive text-sm">{form.error}</p>{/if}

        <Button type="submit" disabled={loading}>{loading ? 'Saving…' : cta}</Button>
      </form>
    </Card.Content>
  </Card.Root>
</main>
