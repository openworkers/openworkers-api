<script lang="ts">
  import WorkerEditor from './worker-editor.svelte';

  let { data } = $props();
</script>

<!-- Keyed so navigating between two workers' edit pages remounts the editor:
     SvelteKit reuses the page component on param-only navigation, which would
     otherwise leave the previous worker's script/undo-stack/env-libs live. -->
{#key data.worker.id}
  <WorkerEditor worker={data.worker} envValues={data.envValues} />
{/key}
