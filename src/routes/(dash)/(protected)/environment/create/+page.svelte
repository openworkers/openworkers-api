<script lang="ts">
  import ResourceCreate from '#lib/components/resource-create.svelte';
  import { createEnvironment } from './create.remote.ts';
</script>

<ResourceCreate title="New environment" form={createEnvironment} />
