<script lang="ts">
  import '../../app.css';

  let { children } = $props();
</script>

<div class="bg-background text-foreground min-h-screen">
  {@render children?.()}
</div>
