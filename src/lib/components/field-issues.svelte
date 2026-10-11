<script lang="ts">
  let { issues }: { issues: { message: string }[] | undefined } = $props();
</script>

{#each issues ?? [] as issue (issue.message)}
  <p class="text-destructive text-sm">{issue.message}</p>
{/each}
