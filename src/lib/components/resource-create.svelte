<script lang="ts">
  import { goto } from '$app/navigation';
  import { api, ApiError } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Card from '$lib/components/ui/card';
  import PageHeader from './page-header.svelte';

  let {
    title,
    base,
    detailHref
  }: { title: string; base: string; detailHref: (id: string) => string } = $props();

  let name = $state('');
  let desc = $state('');
  let saving = $state(false);
  let error = $state<string | null>(null);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    saving = true;
    error = null;

    try {
      const created = await api.post<{ id: string }>(`/api/v1/${base}`, {
        name,
        desc: desc || undefined
      });
      await goto(detailHref(created.id));
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to create';
      saving = false;
    }
  }
</script>

<PageHeader {title} />

<div class="max-w-xl p-8">
  <Card.Root>
    <Card.Content class="pt-6">
      <form class="flex flex-col gap-4" onsubmit={submit}>
        <div class="flex flex-col gap-2">
          <Label for="name">Name</Label>
          <Input id="name" bind:value={name} placeholder="my-resource" required />
        </div>

        <div class="flex flex-col gap-2">
          <Label for="desc">Description <span class="text-muted-foreground">(optional)</span></Label>
          <Input id="desc" bind:value={desc} />
        </div>

        {#if error}
          <p class="text-destructive text-sm">{error}</p>
        {/if}

        <div class="flex justify-end">
          <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create'}</Button>
        </div>
      </form>
    </Card.Content>
  </Card.Root>
</div>
