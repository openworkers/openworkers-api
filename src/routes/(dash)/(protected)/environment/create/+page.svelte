<script lang="ts">
  import ResourceCreate from '$lib/components/resource-create.svelte';
</script>

<ResourceCreate
  title="New environment"
  base="environments"
  detailHref={(id) => `/environment/${id}`}
/>
