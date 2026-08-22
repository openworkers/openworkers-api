<script lang="ts">
  import { untrack } from 'svelte';
  import { api, ApiError } from '$lib/api';
  import type { IWorker } from '$lib/types';
  import type { EnvValue } from '$lib/monaco-setup';
  import { Button } from '$lib/components/ui/button';
  import CodeEditor from '$lib/components/code-editor.svelte';
  import PageHeader from '$lib/components/page-header.svelte';

  // Rendered inside {#key worker.id} by the page: a navigation to another
  // worker remounts this component, so the once-seeded state below (and the
  // Monaco undo stack / env libs inside CodeEditor) can never leak across
  // workers.
  let { worker, envValues }: { worker: IWorker; envValues: EnvValue[] } = $props();

  let script = $state(untrack(() => worker.script ?? ''));
  let deployedScript = $state(untrack(() => worker.script ?? ''));
  let saving = $state(false);
  let error = $state<string | null>(null);
  let saved = $state(false);

  let dirty = $derived(script !== deployedScript);

  async function deploy() {
    // Same semantics as the dash: no-op when the editor matches the deployed
    // script (also guards the Cmd+S shortcut).
    if (saving || script === deployedScript) {
      return;
    }

    saving = true;
    error = null;
    saved = false;

    try {
      await api.patch(`/api/v1/workers/${worker.id}`, { script });
      deployedScript = script;
      saved = true;
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to deploy';
    } finally {
      saving = false;
    }
  }
</script>

<PageHeader title={worker.name ?? 'Edit code'}>
  {#snippet actions()}
    <Button variant="outline" href={`/worker/${worker.id}`}>Back</Button>
    <Button onclick={deploy} disabled={saving || !dirty}>
      {saving ? 'Deploying…' : 'Deploy'}
    </Button>
  {/snippet}
</PageHeader>

<div class="p-8">
  {#if saved}
    <p class="mb-3 text-sm text-green-500">Deployed.</p>
  {/if}

  {#if error}
    <p class="text-destructive mb-3 text-sm">{error}</p>
  {/if}

  <CodeEditor
    bind:value={script}
    language={worker.language === 'wasm' ? 'javascript' : (worker.language ?? 'javascript')}
    {envValues}
    onsave={deploy}
    class="block h-[75vh] overflow-hidden rounded-md border"
  />
</div>
