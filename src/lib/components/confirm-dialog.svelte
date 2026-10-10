<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { confirmState, settleConfirm } from '$lib/confirm.svelte';

  let pending = $derived(confirmState.pending);
</script>

<Dialog.Root
  open={pending !== null}
  onOpenChange={(open) => {
    if (!open) settleConfirm(false);
  }}
>
  <Dialog.Content class="sm:max-w-md">
    {#if pending}
      <Dialog.Header>
        <Dialog.Title>{pending.title}</Dialog.Title>
        <Dialog.Description>{pending.message}</Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer>
        <Button variant="outline" onclick={() => settleConfirm(false)}>Cancel</Button>
        <Button
          variant={pending.destructive ? 'destructive' : 'default'}
          onclick={() => settleConfirm(true)}
        >
          {pending.confirmLabel ?? 'Confirm'}
        </Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>
