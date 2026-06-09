<script lang="ts">
  import { onMount } from 'svelte';
  import { api, ApiError } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import * as Card from '$lib/components/ui/card';
  import { Plus, Trash2 } from '@lucide/svelte';

  let { id }: { id: string } = $props();

  type Value = { id?: string; key: string; value: string; type: 'var' | 'secret' };
  type Environment = { values?: { id: string; key: string; value: string; type?: string }[] | null };

  let values = $state<Value[]>([]);
  let saving = $state(false);
  let error = $state<string | null>(null);

  async function load() {
    try {
      const env = await api.get<Environment>(`/api/v1/environments/${id}`);
      values = (env.values ?? []).map((v) => ({
        id: v.id,
        key: v.key,
        value: v.value,
        type: v.type === 'secret' ? 'secret' : 'var'
      }));
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to load values';
    }
  }

  function add() {
    values = [...values, { key: '', value: '', type: 'var' }];
  }

  function removeAt(index: number) {
    values = values.filter((_, i) => i !== index);
  }

  async function save() {
    saving = true;
    error = null;

    try {
      await api.patch(`/api/v1/environments/${id}`, {
        id,
        values: values
          .filter((v) => v.key.trim())
          .map((v) => (v.id ? { id: v.id, key: v.key, value: v.value } : { key: v.key, value: v.value }))
      });
      await load();
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to save values';
    } finally {
      saving = false;
    }
  }

  onMount(load);
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Variables &amp; secrets</Card.Title>
    <Card.Description>Injected into workers that bind this environment.</Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-3">
    {#each values as v, i (i)}
      <div class="flex items-center gap-2">
        <Input class="flex-1" placeholder="KEY" bind:value={v.key} />
        <Input
          class="flex-1"
          placeholder="value"
          type={v.type === 'secret' ? 'password' : 'text'}
          bind:value={v.value}
        />
        <Button variant="ghost" size="icon-sm" onclick={() => removeAt(i)} aria-label="Remove">
          <Trash2 class="size-4" />
        </Button>
      </div>
    {/each}

    <div class="flex items-center justify-between">
      <Button variant="outline" size="sm" onclick={add}>
        <Plus class="size-4" />
        Add variable
      </Button>
      <Button size="sm" onclick={save} disabled={saving}>{saving ? 'Saving…' : 'Save values'}</Button>
    </div>

    {#if error}
      <p class="text-destructive text-sm">{error}</p>
    {/if}
  </Card.Content>
</Card.Root>
