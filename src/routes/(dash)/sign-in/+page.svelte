<script lang="ts">
  import { goto } from '$app/navigation';
  import { LoginInputSchema, RegisterInputSchema } from '$lib/types';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Card from '$lib/components/ui/card';

  type AuthMode = 'login' | 'register';

  let mode = $state<AuthMode>('login');
  let email = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state<string | null>(null);
  let success = $state<string | null>(null);

  function toggleMode() {
    mode = mode === 'login' ? 'register' : 'login';
    error = null;
    success = null;
    password = '';
  }

  async function submitLogin(event: SubmitEvent) {
    event.preventDefault();
    error = null;

    // Validate client-side with the SAME zod schema the API uses server-side.
    const parsed = LoginInputSchema.safeParse({ email, password });

    if (!parsed.success) {
      error = parsed.error.issues[0]?.message ?? 'Invalid input';
      return;
    }

    loading = true;

    const res = await fetch('/api/v1/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data)
    });

    loading = false;

    if (!res.ok) {
      error = res.status === 401 ? 'Invalid email or password' : 'Login failed';
      return;
    }

    // Hard navigation to clear any in-memory state from a previous session.
    window.location.href = '/workers';
  }

  async function submitRegister(event: SubmitEvent) {
    event.preventDefault();
    error = null;
    success = null;

    const parsed = RegisterInputSchema.safeParse({ email });

    if (!parsed.success) {
      error = parsed.error.issues[0]?.message ?? 'Invalid email';
      return;
    }

    loading = true;

    const res = await fetch('/api/v1/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data)
    });

    const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    loading = false;

    if (res.ok) {
      success = data.message ?? 'Check your email to set your password.';
      email = '';
    } else {
      error = data.error ?? 'Registration failed';
    }
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
        <form class="flex flex-col gap-4" onsubmit={submitLogin}>
          <div class="flex flex-col gap-2">
            <Label for="email">Email</Label>
            <Input id="email" type="email" bind:value={email} autocomplete="email" required />
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <Label for="password">Password</Label>
              <a href="/sign-in/forgot-password" class="text-muted-foreground text-sm hover:underline">
                Forgot?
              </a>
            </div>
            <Input
              id="password"
              type="password"
              bind:value={password}
              autocomplete="current-password"
              required
            />
          </div>

          {#if error}
            <p class="text-destructive text-sm">{error}</p>
          {/if}

          <Button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      {:else}
        <form class="flex flex-col gap-4" onsubmit={submitRegister}>
          <div class="flex flex-col gap-2">
            <Label for="email">Email</Label>
            <Input id="email" type="email" bind:value={email} autocomplete="email" required />
          </div>

          {#if error}
            <p class="text-destructive text-sm">{error}</p>
          {/if}

          {#if success}
            <p class="text-sm text-green-500">{success}</p>
          {/if}

          <Button type="submit" disabled={loading}>
            {loading ? 'Sending…' : 'Register'}
          </Button>
        </form>
      {/if}
    </Card.Content>

    <Card.Footer class="justify-center">
      <button type="button" class="text-muted-foreground text-sm hover:underline" onclick={toggleMode}>
        {mode === 'login'
          ? "Don't have an account? Register"
          : 'Already have an account? Sign in'}
      </button>
    </Card.Footer>
  </Card.Root>
</main>
