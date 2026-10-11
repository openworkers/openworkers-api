<script lang="ts">
  import ResourceCreate from '#lib/components/resource-create.svelte';
  import { createEnvironment } from '../environment.remote.ts';
</script>

<ResourceCreate title="New environment" form={createEnvironment} />
