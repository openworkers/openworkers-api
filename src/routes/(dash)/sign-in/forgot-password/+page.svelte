<script lang="ts">
  import { api, ApiError } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Card from '$lib/components/ui/card';

  let email = $state('');
  let loading = $state(false);
  let error = $state<string | null>(null);
  let success = $state<string | null>(null);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    loading = true;
    error = null;
    success = null;

    try {
      const res = await api.post<{ message: string }>('/api/v1/forgot-password', { email });
      success = res.message ?? 'Check your email for a reset link.';
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Request failed';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Forgot password · OpenWorkers</title></svelte:head>

<main class="flex min-h-screen items-center justify-center p-6">
  <Card.Root class="w-full max-w-sm">
    <Card.Header class="text-center">
      <Card.Title class="text-xl">Reset your password</Card.Title>
      <Card.Description>We'll email you a reset link.</Card.Description>
    </Card.Header>
    <Card.Content>
      <form class="flex flex-col gap-4" onsubmit={submit}>
        <div class="flex flex-col gap-2">
          <Label for="email">Email</Label>
          <Input id="email" type="email" bind:value={email} autocomplete="email" required />
        </div>

        {#if error}<p class="text-destructive text-sm">{error}</p>{/if}
        {#if success}<p class="text-sm text-green-500">{success}</p>{/if}

        <Button type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</Button>
      </form>
    </Card.Content>
    <Card.Footer class="justify-center">
      <a href="/sign-in" class="text-muted-foreground text-sm hover:underline">Back to sign in</a>
    </Card.Footer>
  </Card.Root>
</main>
