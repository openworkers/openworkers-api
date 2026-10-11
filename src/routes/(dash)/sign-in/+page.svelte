<script lang="ts">
  import { Button } from '#lib/components/ui/button/index.ts';
  import { Input } from '#lib/components/ui/input/index.ts';
  import { Label } from '#lib/components/ui/label/index.ts';
  import * as Card from '#lib/components/ui/card/index.ts';
  import FieldIssues from '#lib/components/field-issues.svelte';
  import { register, signIn, signInWithGithub } from '../auth.remote.ts';

  type AuthMode = 'login' | 'register';

  let mode = $state<AuthMode>('login');

  function toggleMode() {
    mode = mode === 'login' ? 'register' : 'login';
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
      <form {...signInWithGithub}>
        <Button type="submit" variant="outline" class="w-full">Continue with GitHub</Button>
      </form>
      <FieldIssues issues={signInWithGithub.fields.allIssues()} />

      <div class="flex items-center gap-3">
        <span class="bg-border h-px flex-1"></span>
        <span class="text-muted-foreground text-xs">or</span>
        <span class="bg-border h-px flex-1"></span>
      </div>

      {#if mode === 'login'}
        <form {...signIn} class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <Label for="email">Email</Label>
            <Input id="email" {...signIn.fields.email.as('email')} autocomplete="email" required />
            <FieldIssues issues={signIn.fields.email.issues()} />
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <Label for="password">Password</Label>
              <a href="/sign-in/forgot-password" class="text-muted-foreground text-sm hover:underline"> Forgot? </a>
            </div>
            <Input id="password" {...signIn.fields._password.as('password')} autocomplete="current-password" required />
          </div>

          <FieldIssues issues={signIn.fields.issues()} />

          <Button type="submit" disabled={!!signIn.pending}>
            {signIn.pending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      {:else}
        <form {...register} class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <Label for="email">Email</Label>
            <Input id="email" {...register.fields.email.as('email')} autocomplete="email" required />
          </div>

          <FieldIssues issues={register.fields.allIssues()} />

          {#if register.result}
            <p class="text-sm text-green-500">{register.result.message}</p>
          {/if}

          <Button type="submit" disabled={!!register.pending}>
            {register.pending ? 'Sending…' : 'Register'}
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
