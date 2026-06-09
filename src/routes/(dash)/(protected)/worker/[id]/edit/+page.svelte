<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { api, ApiError } from '$lib/api';
  import type { IWorker } from '$lib/types';
  import { Button } from '$lib/components/ui/button';
  import { Textarea } from '$lib/components/ui/textarea';
  import PageHeader from '$lib/components/page-header.svelte';

  let id = $derived(page.params.id);

  let script = $state('');
  let loading = $state(true);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let saved = $state(false);

  async function load() {
    try {
      const worker = await api.get<IWorker>(`/api/v1/workers/${id}?script=true`);
      script = worker.script ?? '';
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to load';
    } finally {
      loading = false;
    }
  }

  async function deploy() {
    saving = true;
    error = null;
    saved = false;

    try {
      await api.patch(`/api/v1/workers/${id}`, { script });
      saved = true;
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to deploy';
    } finally {
      saving = false;
    }
  }

  onMount(load);
</script>

<PageHeader title="Edit code">
  {#snippet actions()}
    <Button variant="outline" href={`/worker/${id}`}>Back</Button>
    <Button onclick={deploy} disabled={saving || loading}>{saving ? 'Deploying…' : 'Deploy'}</Button>
  {/snippet}
</PageHeader>

<div class="p-8">
  {#if saved}
    <p class="mb-3 text-sm text-green-500">Deployed.</p>
  {/if}
  {#if error}
    <p class="mb-3 text-destructive text-sm">{error}</p>
  {/if}

  <!-- TODO: swap this Textarea for Monaco (needs vite worker config). -->
  <Textarea
    bind:value={script}
    spellcheck="false"
    disabled={loading}
    class="bg-card h-[70vh] p-4 font-mono leading-relaxed"
    placeholder={loading ? 'Loading…' : '// your worker code'}
  />
</div>
