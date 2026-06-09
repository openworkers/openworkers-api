<script lang="ts">
  import { page } from '$app/state';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import { theme, toggleTheme } from '$lib/theme.svelte';
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

  const nav = [
    { href: '/workers', label: 'Workers', icon: LayoutGrid },
    { href: '/environments', label: 'Environments', icon: Boxes },
    { href: '/databases', label: 'Databases', icon: Database },
    { href: '/kv-namespaces', label: 'KV', icon: KeyRound },
    { href: '/storage-configs', label: 'Storage', icon: HardDrive }
  ];

  function active(href: string): boolean {
    return page.url.pathname === href || page.url.pathname.startsWith(href.replace(/s$/, '') + '/');
  }
</script>

<div class="flex h-screen overflow-hidden">
  <aside class="bg-card flex h-screen w-60 shrink-0 flex-col border-r">
    <div class="flex items-center gap-2 px-4 py-4 font-semibold">
      <svg viewBox="0 0 283.46 283.46" class="size-6 fill-foreground">
        <path
          d="m205.14,205.14l-95.11-95.12,31.71-31.71,63.41,63.41,63.38-63.39C245.26,31.89,197.22,0,141.73,0S38.21,31.89,14.94,78.34l95.09,95.1-31.7,31.7L.71,127.52c-.47,4.67-.71,9.41-.71,14.21,0,78.28,63.46,141.73,141.73,141.73s141.73-63.46,141.73-141.73c0-4.8-.24-9.54-.71-14.21l-77.62,77.62Z"
        />
      </svg>
      OpenWorkers
    </div>

    <Separator />

    <nav class="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
      {#each nav as item (item.href)}
        <a
          href={item.href}
          class="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors {active(
            item.href
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
    {@render children?.()}
  </main>
</div>
