<script lang="ts">
  import { enhance } from '$app/forms';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Card from '$lib/components/ui/card';

  let { form } = $props();

  type AuthMode = 'login' | 'register';

  let mode = $state<AuthMode>('login');
  let loading = $state(false);

  function toggleMode() {
    mode = mode === 'login' ? 'register' : 'login';
  }

  // use:enhance handler that just toggles the loading flag around the request.
  function submit() {
    loading = true;
    return async ({ update }: { update: () => Promise<void> }) => {
      await update();
      loading = false;
    };
  }
</script>

<svelte:head>
  <title>{mode === 'login' ? 'Sign in' : 'Register'} · OpenWorkers</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center p-6">
  <Card.Root class="w-full max-w-sm">
    <Card.Header class="text-center">
      <Card.Title class="text-xl">
        {mode === 'login' ? 'Welcome back' : 'Create your account'}
      </Card.Title>
      <Card.Description>
        {mode === 'login'
          ? 'Sign in to the OpenWorkers dashboard'
          : "Enter your email and we'll send you a link to set your password"}
      </Card.Description>
    </Card.Header>

    <Card.Content class="flex flex-col gap-4">
      <form method="POST" action="?/github">
        <Button type="submit" variant="outline" class="w-full">Continue with GitHub</Button>
      </form>

      <div class="flex items-center gap-3">
        <span class="bg-border h-px flex-1"></span>
        <span class="text-muted-foreground text-xs">or</span>
        <span class="bg-border h-px flex-1"></span>
      </div>

      {#if mode === 'login'}
        <form method="POST" action="?/login" use:enhance={submit} class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <Label for="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={form?.email ?? ''}
              autocomplete="email"
              required
            />
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <Label for="password">Password</Label>
              <a href="/sign-in/forgot-password" class="text-muted-foreground text-sm hover:underline">
                Forgot?
              </a>
            </div>
            <Input id="password" name="password" type="password" autocomplete="current-password" required />
          </div>

          {#if form?.mode === 'login' && form?.error}
            <p class="text-destructive text-sm">{form.error}</p>
          {/if}

          <Button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      {:else}
        <form method="POST" action="?/register" use:enhance={submit} class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <Label for="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={form?.email ?? ''}
              autocomplete="email"
              required
            />
          </div>

          {#if form?.mode === 'register' && form?.error}
            <p class="text-destructive text-sm">{form.error}</p>
          {/if}

          {#if form?.mode === 'register' && form?.success}
            <p class="text-sm text-green-500">{form.success}</p>
          {/if}

          <Button type="submit" disabled={loading}>
            {loading ? 'Sending…' : 'Register'}
          </Button>
        </form>
      {/if}
    </Card.Content>

    <Card.Footer class="justify-center">
      <Button variant="link" size="sm" class="text-muted-foreground" onclick={toggleMode}>
        {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign in'}
      </Button>
    </Card.Footer>
  </Card.Root>
</main>
