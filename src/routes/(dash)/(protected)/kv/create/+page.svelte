<script lang="ts">
  import ResourceCreate from '$lib/components/resource-create.svelte';
</script>

<ResourceCreate title="New KV namespace" base="kv" detailHref={(id) => `/kv/${id}`} />
