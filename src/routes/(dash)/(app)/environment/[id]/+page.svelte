<script lang="ts">
  import { page } from '$app/state';
  import ResourceDetail from '$lib/components/resource-detail.svelte';
  import EnvironmentValues from '$lib/components/environment-values.svelte';

  let id = $derived(page.params.id!);
</script>

{#key id}
  <ResourceDetail base="environments" {id} listHref="/environments">
    {#snippet extra()}
      <EnvironmentValues {id} />
    {/snippet}
  </ResourceDetail>
{/key}
