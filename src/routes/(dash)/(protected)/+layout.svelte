<script lang="ts">
  import { page, updated } from '$app/state';
  import { Button } from '#lib/components/ui/button/index.ts';
  import { Separator } from '#lib/components/ui/separator/index.ts';
  import Logo from '#lib/components/logo.svelte';
  import ConfirmDialog from '#lib/components/confirm-dialog.svelte';
  import { theme, toggleTheme } from '#lib/theme.svelte.ts';
  import {
    Boxes,
    Database,
    HardDrive,
    KeyRound,
    LayoutGrid,
    LogOut,
    Moon,
    Settings,
    Sun
  } from '@lucide/svelte';

  let { data, children } = $props();

  // `detail` is the path prefix of the section's detail and create pages.
  const nav = [
    { href: '/workers', detail: '/worker/', label: 'Workers', icon: LayoutGrid },
    { href: '/environments', detail: '/environment/', label: 'Environments', icon: Boxes },
    { href: '/databases', detail: '/database/', label: 'Databases', icon: Database },
    { href: '/kv-namespaces', detail: '/kv/', label: 'KV', icon: KeyRound },
    { href: '/storage-configs', detail: '/storage/', label: 'Storage', icon: HardDrive }
  ];

  function active(item: (typeof nav)[number]): boolean {
    return page.url.pathname === item.href || page.url.pathname.startsWith(item.detail);
  }
</script>

<div class="flex h-screen overflow-hidden">
  <aside class="bg-card flex h-screen w-60 shrink-0 flex-col border-r">
    <div class="flex items-center gap-2 px-4 py-4 font-semibold">
      <Logo class="size-6 fill-foreground" />
      OpenWorkers
    </div>

    <Separator />

    <nav class="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
      {#each nav as item (item.href)}
        <a
          href={item.href}
          aria-current={active(item) ? 'page' : undefined}
          class="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors {active(
            item
          )
            ? 'bg-secondary text-secondary-foreground font-medium'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
        >
          <item.icon class="size-4" />
          {item.label}
        </a>
      {/each}
    </nav>

    <Separator />

    <div class="flex shrink-0 flex-col gap-1 p-2">
      <a
        href="/account"
        class="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm"
      >
        <Settings class="size-4" />
        {data.profile.username}
      </a>
      <Button
        variant="ghost"
        size="sm"
        class="w-full justify-start gap-2"
        onclick={toggleTheme}
      >
        {#if theme.value === 'dark'}
          <Sun class="size-4" />
          Light mode
        {:else}
          <Moon class="size-4" />
          Dark mode
        {/if}
      </Button>
      <form method="POST" action="/logout">
        <Button type="submit" variant="ghost" size="sm" class="w-full justify-start gap-2">
          <LogOut class="size-4" />
          Sign out
        </Button>
      </form>
    </div>
  </aside>

  <main class="flex-1 overflow-auto">
    {#if updated.current}
      <div class="bg-primary text-primary-foreground flex items-center justify-between gap-4 px-8 py-2 text-sm" role="status">
        A new version of the dashboard is available.
        <Button size="sm" variant="secondary" onclick={() => location.reload()}>Reload</Button>
      </div>
    {/if}
    {@render children?.()}
  </main>
</div>

<ConfirmDialog />
