export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  // A destructive action gets a red button
  destructive?: boolean;
};

type Pending = ConfirmOptions & { resolve: (confirmed: boolean) => void };

export const confirmState = $state<{ pending: Pending | null }>({ pending: null });

/**
 * Opens the confirmation dialog of the dashboard and resolves to the choice of
 * the user. ConfirmDialog, in the protected layout, renders it.
 */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  confirmState.pending?.resolve(false);

  return new Promise((resolve) => {
    confirmState.pending = { ...options, resolve };
  });
}

export function settleConfirm(confirmed: boolean) {
  confirmState.pending?.resolve(confirmed);
  confirmState.pending = null;
}
