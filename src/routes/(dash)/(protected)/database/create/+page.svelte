<script lang="ts">
  import { Button } from '#lib/components/ui/button/index.ts';
  import { Input } from '#lib/components/ui/input/index.ts';
  import { Label } from '#lib/components/ui/label/index.ts';
  import * as Card from '#lib/components/ui/card/index.ts';
  import PageHeader from '#lib/components/page-header.svelte';
  import FieldIssues from '#lib/components/field-issues.svelte';
  import ChoiceButton from '#lib/components/choice-button.svelte';
  import { createDatabase } from '../database.remote.ts';

  const { fields } = createDatabase;
</script>

<PageHeader title="New database" />

<div class="max-w-xl p-8">
  <Card.Root>
    <Card.Content class="pt-6">
      <!-- CSS hides the connection string while Platform is checked, so the form works without JS -->
      <form class="group flex flex-col gap-4" {...createDatabase}>
        <fieldset>
          <legend class="mb-2 text-sm leading-none font-medium">Provider</legend>
          <div class="flex gap-2">
            <ChoiceButton input={fields.provider.as('radio', 'platform', true)}>Platform</ChoiceButton>
            <ChoiceButton input={fields.provider.as('radio', 'postgres')}>Postgres</ChoiceButton>
            <Button variant="outline" href="/database/connect/planetscale">PlanetScale…</Button>
          </div>
        </fieldset>

        <div class="flex flex-col gap-2">
          <Label for="name">Name</Label>
          <Input id="name" {...fields.name.as('text')} required />
          <FieldIssues issues={fields.name.issues()} />
        </div>

        <div class="flex flex-col gap-2">
          <Label for="desc">Description <span class="text-muted-foreground">(optional)</span></Label>
          <Input id="desc" {...fields.desc.as('text')} />
          <FieldIssues issues={fields.desc.issues()} />
        </div>

        <div class="flex flex-col gap-2 group-has-[input[value=platform]:checked]:hidden">
          <Label for="cs">Connection string</Label>
          <Input id="cs" {...fields._connectionString.as('password')} placeholder="postgres://…" />
          <FieldIssues issues={fields._connectionString.issues()} />
        </div>

        <FieldIssues issues={fields.issues()} />

        <div class="flex justify-end">
          <Button type="submit" disabled={!!createDatabase.pending}>
            {createDatabase.pending ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form>
    </Card.Content>
  </Card.Root>
</div>
