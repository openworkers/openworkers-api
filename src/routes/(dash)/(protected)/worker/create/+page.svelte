<script lang="ts">
  import { Button } from '#lib/components/ui/button/index.ts';
  import { Input } from '#lib/components/ui/input/index.ts';
  import { Label } from '#lib/components/ui/label/index.ts';
  import * as Card from '#lib/components/ui/card/index.ts';
  import PageHeader from '#lib/components/page-header.svelte';
  import FieldIssues from '#lib/components/field-issues.svelte';
  import ChoiceButton from '#lib/components/choice-button.svelte';
  import { createWorker } from './create.remote.ts';

  const { fields } = createWorker;
</script>

<PageHeader title="New worker" />

<div class="max-w-xl p-8">
  <Card.Root>
    <Card.Content class="pt-6">
      <form class="flex flex-col gap-4" {...createWorker}>
        <div class="flex flex-col gap-2">
          <Label for="name">Name</Label>
          <Input id="name" {...fields.name.as('text')} placeholder="my-worker" required />
          <FieldIssues issues={fields.name.issues()} />
        </div>

        <div class="flex flex-col gap-2">
          <Label for="desc">Description <span class="text-muted-foreground">(optional)</span></Label>
          <Input id="desc" {...fields.desc.as('text')} />
          <FieldIssues issues={fields.desc.issues()} />
        </div>

        <fieldset>
          <legend class="mb-2 text-sm leading-none font-medium">Language</legend>
          <div class="flex gap-2">
            <ChoiceButton input={fields.language.as('radio', 'typescript', true)}>TypeScript</ChoiceButton>
            <ChoiceButton input={fields.language.as('radio', 'javascript')}>JavaScript</ChoiceButton>
          </div>
        </fieldset>

        <FieldIssues issues={fields.issues()} />

        <div class="flex justify-end">
          <Button type="submit" disabled={!!createWorker.pending}>
            {createWorker.pending ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form>
    </Card.Content>
  </Card.Root>
</div>
