<script lang="ts">
  import type { RemoteForm } from '$app/server';
  import { page } from '$app/state';
  import { Button } from '#lib/components/ui/button/index.ts';
  import { Input } from '#lib/components/ui/input/index.ts';
  import { Label } from '#lib/components/ui/label/index.ts';
  import * as Card from '#lib/components/ui/card/index.ts';
  import FieldIssues from './field-issues.svelte';

  let {
    title,
    cta,
    form
  }: {
    title: string;
    cta: string;
    form: RemoteForm<{ token: string; _password: string; _confirm: string }, unknown>;
  } = $props();

  let token = $derived(page.url.searchParams.get('token') ?? '');
</script>

<svelte:head><title>{title} · OpenWorkers</title></svelte:head>

<main class="flex min-h-screen items-center justify-center p-6">
  <Card.Root class="w-full max-w-sm">
    <Card.Header class="text-center">
      <Card.Title class="text-xl">{title}</Card.Title>
    </Card.Header>
    <Card.Content>
      <form {...form} class="flex flex-col gap-4">
        <input {...form.fields.token.as('hidden', token)} />

        <div class="flex flex-col gap-2">
          <Label for="password">New password</Label>
          <Input id="password" {...form.fields._password.as('password')} autocomplete="new-password" required />
          <FieldIssues issues={form.fields._password.issues()} />
        </div>

        <div class="flex flex-col gap-2">
          <Label for="confirm">Confirm password</Label>
          <Input id="confirm" {...form.fields._confirm.as('password')} autocomplete="new-password" required />
          <FieldIssues issues={form.fields._confirm.issues()} />
        </div>

        <FieldIssues issues={form.fields.token.issues()} />
        <FieldIssues issues={form.fields.issues()} />

        <Button type="submit" disabled={!!form.pending}>{form.pending ? 'Saving…' : cta}</Button>
      </form>
    </Card.Content>
  </Card.Root>
</main>
