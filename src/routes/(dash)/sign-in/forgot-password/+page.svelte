<script lang="ts">
  import { Button } from '#lib/components/ui/button/index.ts';
  import { Input } from '#lib/components/ui/input/index.ts';
  import { Label } from '#lib/components/ui/label/index.ts';
  import * as Card from '#lib/components/ui/card/index.ts';
  import FieldIssues from '#lib/components/field-issues.svelte';
  import { requestPasswordReset } from './forgot-password.remote.ts';

  const { fields } = requestPasswordReset;
</script>

<svelte:head><title>Forgot password · OpenWorkers</title></svelte:head>

<main class="flex min-h-screen items-center justify-center p-6">
  <Card.Root class="w-full max-w-sm">
    <Card.Header class="text-center">
      <Card.Title class="text-xl">Reset your password</Card.Title>
      <Card.Description>We'll email you a reset link.</Card.Description>
    </Card.Header>
    <Card.Content>
      <form class="flex flex-col gap-4" {...requestPasswordReset}>
        <div class="flex flex-col gap-2">
          <Label for="email">Email</Label>
          <Input id="email" {...fields.email.as('email')} autocomplete="email" required />
          <FieldIssues issues={fields.email.issues()} />
        </div>

        {#if requestPasswordReset.result}
          <p class="text-sm text-green-500">{requestPasswordReset.result.message}</p>
        {/if}

        <Button type="submit" disabled={!!requestPasswordReset.pending}>
          {requestPasswordReset.pending ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </Card.Content>
    <Card.Footer class="justify-center">
      <a href="/sign-in" class="text-muted-foreground text-sm hover:underline">Back to sign in</a>
    </Card.Footer>
  </Card.Root>
</main>
