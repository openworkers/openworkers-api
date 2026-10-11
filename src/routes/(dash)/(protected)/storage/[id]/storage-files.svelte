<script lang="ts">
  import { refreshAll } from '$app/navigation';
  import { confirmDialog } from '#lib/confirm.svelte.ts';
  import { remoteErrorMessage } from '#lib/remote-errors.ts';
  import { Button } from '#lib/components/ui/button/index.ts';
  import { Input } from '#lib/components/ui/input/index.ts';
  import * as Card from '#lib/components/ui/card/index.ts';
  import * as Table from '#lib/components/ui/table/index.ts';
  import { Download, Trash2, Upload } from '@lucide/svelte';
  import { deleteStorageFile, presignStorageUpload } from '../storage.remote.ts';

  type File = { key: string; size: number; lastModified: string; url: string };

  let {
    id,
    prefix,
    files,
    cursor,
    filesError
  }: { id: string; prefix: string; files: File[]; cursor: string | null; filesError: string | null } = $props();

  let error = $state<string | null>(null);
  let uploading = $state<string | null>(null);

  function size(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function nextHref(next: string): string {
    return `?${new URLSearchParams(prefix ? { prefix, cursor: next } : { cursor: next })}`;
  }

  async function sha256Base64(file: Blob): Promise<string> {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()));
    return btoa(String.fromCharCode(...digest));
  }

  async function upload(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    error = null;

    try {
      for (const file of input.files ?? []) {
        uploading = file.name;
        const type = file.type || 'application/octet-stream';
        const checksum = await sha256Base64(file);
        const key = `${prefix}${file.name}`;
        const url = await presignStorageUpload({ id, key, size: file.size, type, checksum });
        const res = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': type, 'x-amz-checksum-sha256': checksum },
          body: file
        });

        if (!res.ok) {
          throw new Error(`The storage refused ${file.name} (${res.status})`);
        }
      }

      await refreshAll();
    } catch (e) {
      error = e instanceof Error && !('status' in e) ? e.message : remoteErrorMessage(e, 'Failed to upload');
    } finally {
      uploading = null;
      input.value = '';
    }
  }

  async function remove(key: string) {
    const confirmed = await confirmDialog({
      title: `Delete ${key}`,
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true
    });

    if (!confirmed) return;

    error = null;

    try {
      await deleteStorageFile({ id, key });
      await refreshAll();
    } catch (e) {
      error = remoteErrorMessage(e, 'Failed to delete');
    }
  }
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Files</Card.Title>
    <Card.Description>Up to 100 files per page; uploads go straight to the storage (100 MB max each).</Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-2">
      <form method="GET" class="flex flex-1 gap-2">
        <Input name="prefix" value={prefix} placeholder="Filter by prefix, e.g. images/" class="flex-1" />
        <Button type="submit" variant="outline">Filter</Button>
      </form>
      <Button
        variant="outline"
        disabled={!!uploading}
        onclick={() => document.getElementById('storage-upload')?.click()}
      >
        <Upload class="size-4" />
        {uploading ? `Uploading ${uploading}…` : 'Upload'}
      </Button>
      <input id="storage-upload" type="file" multiple class="hidden" onchange={upload} />
    </div>

    {#if filesError}<p class="text-destructive text-sm">{filesError}</p>{/if}
    {#if error}<p class="text-destructive text-sm">{error}</p>{/if}

    {#if files.length > 0}
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Name</Table.Head>
            <Table.Head class="w-24 text-right">Size</Table.Head>
            <Table.Head class="w-44">Modified</Table.Head>
            <Table.Head class="w-24"></Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each files as file (file.key)}
            <Table.Row>
              <Table.Cell class="font-mono text-xs break-all">{file.key}</Table.Cell>
              <Table.Cell class="text-muted-foreground text-right text-xs">{size(file.size)}</Table.Cell>
              <Table.Cell class="text-muted-foreground text-xs"
                >{new Date(file.lastModified).toLocaleString()}</Table.Cell
              >
              <Table.Cell class="text-right">
                <Button variant="ghost" size="icon-sm" href={file.url} aria-label="Download" title="Download">
                  <Download class="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onclick={() => remove(file.key)}
                  aria-label="Delete"
                  title="Delete"
                >
                  <Trash2 class="size-4" />
                </Button>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    {:else if !filesError}
      <p class="text-muted-foreground text-sm">{prefix ? `No file starts with ${prefix}.` : 'No files.'}</p>
    {/if}

    {#if cursor}
      <div class="flex justify-end">
        <Button variant="outline" href={nextHref(cursor)}>More</Button>
      </div>
    {/if}
  </Card.Content>
</Card.Root>
