<script lang="ts">
  import { refreshAll } from '$app/navigation';
  import { confirmDialog } from '#lib/confirm.svelte.ts';
  import { remoteErrorMessage } from '#lib/remote-errors.ts';
  import { Button } from '#lib/components/ui/button/index.ts';
  import { Input } from '#lib/components/ui/input/index.ts';
  import { Label } from '#lib/components/ui/label/index.ts';
  import * as Card from '#lib/components/ui/card/index.ts';
  import * as Table from '#lib/components/ui/table/index.ts';
  import PageHeader from '#lib/components/page-header.svelte';
  import FieldIssues from '#lib/components/field-issues.svelte';
  import { Trash2 } from '@lucide/svelte';
  import { createAccountApiKey, revokeAccountApiKey } from './account.remote.ts';
  import { signOut } from '../../auth.remote.ts';

  let { data } = $props();

  let error = $state<string | null>(null);

  async function removeKey(id: string, name: string) {
    const confirmed = await confirmDialog({
      title: `Revoke ${name}`,
      message: 'A client that uses this API key can no longer authenticate.',
      confirmLabel: 'Revoke',
      destructive: true
    });

    if (!confirmed) return;

    error = null;

    try {
      await revokeAccountApiKey(id);
      await refreshAll();
    } catch (e) {
      error = remoteErrorMessage(e, 'Failed to revoke key');
    }
  }
</script>

<PageHeader title="Account" description="Your profile and API keys." />

<div class="flex max-w-3xl flex-col gap-6 p-8">
  <Card.Root>
    <Card.Header>
      <Card.Title>Resource limits</Card.Title>
    </Card.Header>
    <Card.Content class="grid grid-cols-5 gap-4 text-center">
      {#each [['Workers', data.profile.limits.workers], ['Environments', data.profile.limits.environments], ['Databases', data.profile.limits.databases], ['KV', data.profile.limits.kv], ['Storage', data.profile.limits.storage]] as [label, value] (label)}
        <div>
          <p class="text-2xl font-semibold">{value}</p>
          <p class="text-muted-foreground text-sm">{label}</p>
        </div>
      {/each}
    </Card.Content>
  </Card.Root>

  <Card.Root>
    <Card.Header>
      <Card.Title>Profile</Card.Title>
    </Card.Header>
    <Card.Content class="flex items-center justify-between">
      <div>
        <p class="font-medium">{data.profile.username}</p>
        <p class="text-muted-foreground text-sm">{data.profile.id}</p>
      </div>
      <form {...signOut.for('account')}>
        <Button type="submit" variant="outline">Sign out</Button>
      </form>
    </Card.Content>
  </Card.Root>

  <Card.Root>
    <Card.Header>
      <Card.Title>API keys</Card.Title>
      <Card.Description>Use these to authenticate the CLI and CI.</Card.Description>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      {#if createAccountApiKey.result}
        <div class="bg-muted rounded-md border p-3">
          <p class="text-sm font-medium">Copy your new token now — it won't be shown again:</p>
          <code class="mt-2 block break-all text-xs">{createAccountApiKey.result.token}</code>
        </div>
      {/if}

      <form class="flex items-end gap-2" {...createAccountApiKey}>
        <div class="flex flex-1 flex-col gap-2">
          <Label for="keyname">New key name</Label>
          <Input id="keyname" {...createAccountApiKey.fields.name.as('text')} placeholder="ci-deploy" required />
        </div>
        <Button type="submit" disabled={!!createAccountApiKey.pending}>Create</Button>
      </form>

      <FieldIssues issues={createAccountApiKey.fields.allIssues()} />

      {#if error}
        <p class="text-destructive text-sm">{error}</p>
      {/if}

      {#if data.keys.length > 0}
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Name</Table.Head>
              <Table.Head>Prefix</Table.Head>
              <Table.Head class="w-12"></Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each data.keys as key (key.id)}
              <Table.Row>
                <Table.Cell class="font-medium">{key.name}</Table.Cell>
                <Table.Cell class="text-muted-foreground font-mono text-xs">
                  {key.tokenPrefix}…
                </Table.Cell>
                <Table.Cell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onclick={() => removeKey(key.id, key.name)}
                    aria-label="Revoke"
                  >
                    <Trash2 class="size-4" />
                  </Button>
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
