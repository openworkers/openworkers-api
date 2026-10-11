<script lang="ts">
  import ResourceCreate from '#lib/components/resource-create.svelte';
  import { createKvNamespace } from '../kv.remote.ts';
</script>

<ResourceCreate title="New KV namespace" form={createKvNamespace} />
