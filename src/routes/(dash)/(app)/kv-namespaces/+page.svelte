<script lang="ts">
  import ResourceList from '$lib/components/resource-list.svelte';
</script>

<ResourceList
  title="KV Namespaces"
  description="Key-value stores for your workers."
  base="kv"
  createHref="/kv/create"
  rowHref={(id) => `/kv/${id}`}
  emptyLabel="No KV namespaces yet."
/>
