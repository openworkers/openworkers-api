<script lang="ts">
  import WorkerLogs from './worker-logs.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>{data.worker.name ?? 'Worker'} · Logs</title>
</svelte:head>

<!-- Keyed so navigating between two workers' logs closes the old socket and
     starts from an empty buffer. -->
{#key data.worker.id}
  <WorkerLogs worker={data.worker} />
{/key}
