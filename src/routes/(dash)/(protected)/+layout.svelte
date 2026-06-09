<script lang="ts">
  import { page } from '$app/state';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import Logo from '$lib/components/logo.svelte';
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
      <Logo class="size-6 fill-foreground" />
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
