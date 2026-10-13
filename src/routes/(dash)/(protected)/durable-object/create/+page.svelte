<script lang="ts">
  import { Button } from '#lib/components/ui/button/index.ts';
  import { Input } from '#lib/components/ui/input/index.ts';
  import { Label } from '#lib/components/ui/label/index.ts';
  import * as Card from '#lib/components/ui/card/index.ts';
  import PageHeader from '#lib/components/page-header.svelte';
  import FieldIssues from '#lib/components/field-issues.svelte';
  import { createNamespace } from '../durable-object.remote.ts';

  let { data } = $props();

  const { fields } = createNamespace;
</script>

<PageHeader title="New Durable Object namespace" />

<div class="max-w-xl p-8">
  <Card.Root>
    <Card.Content class="pt-6">
      <form class="flex flex-col gap-4" {...createNamespace}>
        <div class="flex flex-col gap-2">
          <Label for="name">Name</Label>
          <Input id="name" {...fields.name.as('text')} placeholder="counters" required />
          <FieldIssues issues={fields.name.issues()} />
        </div>

        <div class="flex flex-col gap-2">
          <Label for="worker">Worker</Label>
          <select
            id="worker"
            class="border-input bg-background dark:bg-input/30 flex h-9 w-full rounded-md border px-3 py-1 text-base shadow-xs outline-none md:text-sm"
            {...fields.worker.as('select')}
            required
          >
            <option value="" disabled selected>Choose the worker that exports the class</option>
            {#each data.workers as worker (worker.id)}
              <option value={worker.id}>{worker.name ?? worker.id}</option>
            {/each}
          </select>
          <FieldIssues issues={fields.worker.issues()} />
        </div>

        <div class="flex flex-col gap-2">
          <Label for="className">Class</Label>
          <Input id="className" {...fields.className.as('text')} placeholder="Counter" required />
          <p class="text-muted-foreground text-sm">The name the worker exports the class under.</p>
          <FieldIssues issues={fields.className.issues()} />
        </div>

        <div class="flex flex-col gap-2">
          <Label for="desc">Description <span class="text-muted-foreground">(optional)</span></Label>
          <Input id="desc" {...fields.desc.as('text')} />
          <FieldIssues issues={fields.desc.issues()} />
        </div>

        <FieldIssues issues={fields.issues()} />

        <div class="flex justify-end">
          <Button type="submit" disabled={!!createNamespace.pending}>
            {createNamespace.pending ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form>
    </Card.Content>
  </Card.Root>
</div>
