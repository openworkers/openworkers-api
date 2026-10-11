<script lang="ts">
  import ResourceCreate from '#lib/components/resource-create.svelte';
  import { createD1Database } from '../d1.remote.ts';
</script>

<ResourceCreate title="New D1 database" form={createD1Database} />
