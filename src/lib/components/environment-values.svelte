<script lang="ts">
  import { untrack } from 'svelte';
  import { api, ApiError } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Card from '$lib/components/ui/card';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Select from '$lib/components/ui/select';
  import { Box, Lock, LockOpen, Plus, RotateCcw, Trash2 } from '@lucide/svelte';

  type BindingType = 'var' | 'secret' | 'assets' | 'storage' | 'kv' | 'database' | 'worker';
  type Value = { id: string; key: string; value: string; type: BindingType };
  type Resource = { id: string; name: string | null };
  type Kind = 'storage' | 'kv' | 'database' | 'worker';

  let {
    id,
    values: initialValues = [],
    storage = [],
    kv = [],
    databases = [],
    workers = []
  }: {
    id: string;
    values?: Value[];
    storage?: Resource[];
    kv?: Resource[];
    databases?: Resource[];
    workers?: Resource[];
  } = $props();

  const RESOURCE_TYPES: BindingType[] = ['assets', 'storage', 'kv', 'database', 'worker'];

  type Row = {
    id?: string;
    key: string;
    value: string;
    type: BindingType;
    origKey: string;
    origValue: string;
    origType: BindingType;
    deleted: boolean;
    isNew: boolean;
  };

  function toRow(v: Value): Row {
    return {
      id: v.id,
      key: v.key,
      value: v.value,
      type: v.type,
      origKey: v.key,
      origValue: v.value,
      origType: v.type,
      deleted: false,
      isNew: false
    };
  }

  let rows = $state<Row[]>(untrack(() => initialValues.map(toRow)));
  let saving = $state(false);
  let error = $state<string | null>(null);

  const isBinding = (t: BindingType) => RESOURCE_TYPES.includes(t);

  function rowChanged(r: Row): boolean {
    if (r.isNew) return !r.deleted;
    return r.deleted || r.key !== r.origKey || r.value !== r.origValue || r.type !== r.origType;
  }

  let dirty = $derived(rows.some(rowChanged));

  let duplicateKey = $derived.by(() => {
    const keys = rows.filter((r) => !r.deleted).map((r) => r.key);
    return keys.find((k, i) => k && keys.indexOf(k) !== i) ?? null;
  });

  function addVariable() {
    rows = [
      ...rows,
      { key: '', value: '', type: 'var', origKey: '', origValue: '', origType: 'var', deleted: false, isNew: true }
    ];
  }

  function toggleSecret(r: Row) {
    r.type = r.type === 'secret' ? 'var' : 'secret';
  }

  function resetSecret(r: Row) {
    if (!confirm('Reset this secret? Its value will be cleared.')) return;
    r.value = '';
    r.type = 'var';
  }

  function remove(r: Row) {
    if (r.isNew) {
      rows = rows.filter((x) => x !== r);
    } else {
      r.deleted = true;
    }
  }

  function reset() {
    rows = initialValues.map(toRow);
    error = null;
  }

  function resourceList(type: BindingType): Resource[] {
    if (type === 'kv') return kv;
    if (type === 'database') return databases;
    if (type === 'worker') return workers;
    return storage;
  }

  function resourceName(type: BindingType, value: string): string {
    const name = resourceList(type).find((x) => x.id === value)?.name;
    return name ? `${name} (${type})` : type;
  }

  function resourceHref(type: BindingType, value: string): string {
    if (type === 'kv') return `/kv/${value}`;
    if (type === 'database') return `/database/${value}`;
    if (type === 'worker') return `/worker/${value}`;
    return `/storage/${value}`;
  }

  async function save() {
    if (duplicateKey) return;
    saving = true;
    error = null;

    const payload = rows.filter(rowChanged).map((r) => {
      if (r.isNew) return { key: r.key, value: r.value, type: r.type };
      if (r.deleted) return { id: r.id, value: null };
      return {
        id: r.id,
        ...(r.key !== r.origKey ? { key: r.key } : null),
        ...(r.value !== r.origValue ? { value: r.value } : null),
        ...(r.type !== r.origType ? { type: r.type } : null)
      };
    });

    try {
      const updated = await api.patch<{ values?: Value[] }>(`/api/v1/environments/${id}`, { id, values: payload });
      rows = (updated.values ?? []).map(toRow);
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Failed to save';
    } finally {
      saving = false;
    }
  }

  // --- Add resource-binding dialog ---
  let dialogKind = $state<Kind | null>(null);
  let bindingKey = $state('');
  let bindingResource = $state('');
  let storageType = $state('assets');

  const KIND_LABEL: Record<Kind, string> = {
    storage: 'Storage',
    kv: 'KV',
    database: 'Database',
    worker: 'Worker'
  };
  const KIND_CREATE: Record<Kind, string> = {
    storage: '/storage/create',
    kv: '/kv/create',
    database: '/database/create',
    worker: '/worker/create'
  };

  function openDialog(kind: Kind) {
    dialogKind = kind;
    bindingKey = '';
    bindingResource = '';
    storageType = 'assets';
  }

  let dialogResources = $derived(dialogKind ? resourceList(dialogKind === 'storage' ? 'storage' : dialogKind) : []);
  let selectedResourceName = $derived(
    dialogResources.find((r) => r.id === bindingResource)?.name ?? 'Select…'
  );

  function confirmBinding() {
    if (!bindingKey || !bindingResource || !dialogKind) return;
    const type = (dialogKind === 'storage' ? storageType : dialogKind) as BindingType;
    rows = [
      ...rows,
      { key: bindingKey, value: bindingResource, type, origKey: '', origValue: '', origType: 'var', deleted: false, isNew: true }
    ];
    dialogKind = null;
  }
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Variables &amp; bindings</Card.Title>
    <Card.Description>Injected into workers that bind this environment.</Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-3">
    {#if rows.length > 0}
      <ul class="flex flex-col gap-2">
        {#each rows as row (row)}
          <li class="flex items-center gap-2 {row.deleted ? 'opacity-50' : ''}">
            {#if isBinding(row.type)}
              <span class="flex-1 truncate font-mono text-sm">{row.key}</span>
              <a
                href={resourceHref(row.type, row.value)}
                class="text-primary flex flex-1 items-center gap-1 truncate text-sm hover:underline"
              >
                <Box class="size-4 shrink-0" />
                {resourceName(row.type, row.value)}
              </a>
            {:else}
              <Input class="flex-1 font-mono" placeholder="KEY" bind:value={row.key} disabled={row.deleted} />
              {#if row.type === 'secret'}
                <span class="text-muted-foreground flex-1 px-3 text-sm tracking-widest">••••••••</span>
              {:else}
                <Input class="flex-1" placeholder="value" bind:value={row.value} disabled={row.deleted} />
              {/if}

              {#if row.origType === 'secret' && row.type === 'secret'}
                <Button variant="ghost" size="icon-sm" onclick={() => resetSecret(row)} aria-label="Reset secret">
                  <Lock class="size-4" />
                </Button>
              {:else}
                <Button variant="ghost" size="icon-sm" onclick={() => toggleSecret(row)} aria-label="Toggle secret">
                  {#if row.type === 'secret'}<Lock class="size-4" />{:else}<LockOpen class="size-4" />{/if}
                </Button>
              {/if}
            {/if}

            {#if row.deleted}
              <Button variant="ghost" size="icon-sm" onclick={() => (row.deleted = false)} aria-label="Undo">
                <RotateCcw class="size-4" />
              </Button>
            {:else}
              <Button variant="ghost" size="icon-sm" onclick={() => remove(row)} aria-label="Remove">
                <Trash2 class="size-4" />
              </Button>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}

    {#if duplicateKey}
      <p class="text-destructive text-xs">Duplicate key: {duplicateKey}</p>
    {/if}
    {#if error}
      <p class="text-destructive text-sm">{error}</p>
    {/if}

    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onclick={addVariable}>
          <Plus class="size-4" /> Variable
        </Button>
        <Button variant="outline" size="sm" onclick={() => openDialog('storage')}>
          <Plus class="size-4" /> Storage
        </Button>
        <Button variant="outline" size="sm" onclick={() => openDialog('kv')}>
          <Plus class="size-4" /> KV
        </Button>
        <Button variant="outline" size="sm" onclick={() => openDialog('database')}>
          <Plus class="size-4" /> Database
        </Button>
        <Button variant="outline" size="sm" onclick={() => openDialog('worker')}>
          <Plus class="size-4" /> Worker
        </Button>
      </div>

      {#if dirty}
        <div class="flex gap-2">
          <Button variant="ghost" size="sm" onclick={reset}>Reset</Button>
          <Button size="sm" onclick={save} disabled={saving || !!duplicateKey}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      {/if}
    </div>
  </Card.Content>
</Card.Root>

<Dialog.Root open={dialogKind !== null} onOpenChange={(o) => { if (!o) dialogKind = null; }}>
  <Dialog.Content class="sm:max-w-md">
    {#if dialogKind}
      <Dialog.Header>
        <Dialog.Title>Add {KIND_LABEL[dialogKind]} binding</Dialog.Title>
      </Dialog.Header>

      <div class="flex flex-col gap-4 py-2">
        <div class="flex flex-col gap-2">
          <Label for="binding-key">Binding name</Label>
          <Input id="binding-key" placeholder="API" bind:value={bindingKey} />
        </div>

        <div class="flex flex-col gap-2">
          <Label>{KIND_LABEL[dialogKind]}</Label>
          {#if dialogResources.length > 0}
            <Select.Root type="single" bind:value={bindingResource}>
              <Select.Trigger class="w-full">{selectedResourceName}</Select.Trigger>
              <Select.Content>
                {#each dialogResources as r (r.id)}
                  <Select.Item value={r.id} label={r.name ?? r.id}>{r.name ?? r.id}</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          {:else}
            <p class="text-muted-foreground text-sm">
              None yet. <a href={KIND_CREATE[dialogKind]} class="text-primary hover:underline">Create one</a>.
            </p>
          {/if}
        </div>

        {#if dialogKind === 'storage'}
          <div class="flex flex-col gap-2">
            <Label>Access</Label>
            <Select.Root type="single" bind:value={storageType}>
              <Select.Trigger class="w-full">
                {storageType === 'assets' ? 'Assets (read-only)' : 'Storage (read/write)'}
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="assets">Assets (read-only)</Select.Item>
                <Select.Item value="storage">Storage (read/write)</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>
        {/if}
      </div>

      <Dialog.Footer>
        <Button variant="ghost" onclick={() => (dialogKind = null)}>Cancel</Button>
        <Button onclick={confirmBinding} disabled={!bindingKey || !bindingResource}>Add</Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>
