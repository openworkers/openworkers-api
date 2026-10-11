<script lang="ts">
  import type { RemoteForm } from '$app/server';
  import { Button } from '#lib/components/ui/button/index.ts';
  import { Input } from '#lib/components/ui/input/index.ts';
  import { Label } from '#lib/components/ui/label/index.ts';
  import * as Card from '#lib/components/ui/card/index.ts';
  import PageHeader from './page-header.svelte';
  import FieldIssues from './field-issues.svelte';

  let { title, form }: { title: string; form: RemoteForm<{ name: string; desc?: string }, unknown> } = $props();
</script>

<PageHeader {title} />

<div class="max-w-xl p-8">
  <Card.Root>
    <Card.Content class="pt-6">
      <form class="flex flex-col gap-4" {...form}>
        <div class="flex flex-col gap-2">
          <Label for="name">Name</Label>
          <Input id="name" {...form.fields.name.as('text')} placeholder="my-resource" required />
          <FieldIssues issues={form.fields.name.issues()} />
        </div>

        <div class="flex flex-col gap-2">
          <Label for="desc">Description <span class="text-muted-foreground">(optional)</span></Label>
          <Input id="desc" {...form.fields.desc.as('text')} />
          <FieldIssues issues={form.fields.desc.issues()} />
        </div>

        <FieldIssues issues={form.fields.issues()} />

        <div class="flex justify-end">
          <Button type="submit" disabled={!!form.pending}>{form.pending ? 'Creating…' : 'Create'}</Button>
        </div>
      </form>
    </Card.Content>
  </Card.Root>
</div>
