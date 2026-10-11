<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';
  import { buttonVariants } from '#lib/components/ui/button/index.ts';
  import { cn } from '#lib/utils.ts';

  let {
    input,
    disabled = false,
    children
  }: { input: HTMLInputAttributes; disabled?: boolean; children: Snippet } = $props();
</script>

<!-- A radio drawn as a button; CSS shows the choice, so it works without JS -->
<label
  class={cn(
    buttonVariants({ variant: 'outline' }),
    'has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-checked:hover:bg-primary/80 dark:has-checked:border-primary dark:has-checked:bg-primary dark:has-checked:hover:bg-primary/80 has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-disabled:pointer-events-none has-disabled:opacity-50 cursor-pointer'
  )}
>
  <input class="sr-only" {...input} {disabled} />
  {@render children()}
</label>
