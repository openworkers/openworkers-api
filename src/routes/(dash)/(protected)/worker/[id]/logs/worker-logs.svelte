<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import PageHeader from '$lib/components/page-header.svelte';
  import { parseAnsi, stripAnsi, type AnsiSegment } from '$lib/utils/ansi';
  import { cn } from '$lib/utils';
  import { ArrowDown, Code, Download, Pause, Play, RotateCw, Search, Trash2 } from '@lucide/svelte';

  let { worker }: { worker: { id: string; name: string | null } } = $props();

  const MAX_ENTRIES = 2000;
  const RETRY_DELAYS = [1000, 2000, 5000, 10000, 20000, 30000];
  // A connection that drops sooner than this counts as a failed attempt, so a
  // server that accepts then closes right away can't keep us reconnecting.
  const STABLE_MS = 5000;

  const LEVELS = ['error', 'warn', 'info', 'log', 'debug'] as const;
  type Level = (typeof LEVELS)[number];
  type Tone = 'ok' | 'warn' | 'error';
  type Status = 'connecting' | 'live' | 'reconnecting' | 'closed';

  interface Entry {
    id: number;
    kind: 'log' | 'system';
    date: number;
    /** Level as reported by the runtime. */
    level: string;
    /** Bucket used by the level filter. */
    group: Level;
    tone?: Tone;
    /** Plain text, lowercased, for search. */
    search: string;
    text: string;
    segments: AnsiSegment[];
  }

  let entries = $state.raw<Entry[]>([]);
  let held = $state.raw<Entry[]>([]);
  let trimmed = $state(false);
  let status = $state<Status>('connecting');
  let closedReason = $state<string | null>(null);
  let paused = $state(false);
  let follow = $state(true);
  let query = $state('');
  let enabled = $state<Record<Level, boolean>>({
    error: true,
    warn: true,
    info: true,
    log: true,
    debug: true
  });

  let viewport = $state<HTMLDivElement>();

  let nextId = 0;
  let queue: Entry[] = [];
  let frame = 0;

  let socket: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let reconnectWhenVisible = false;
  let attempt = 0;
  let openedAt = 0;
  let disposed = false;

  const counts = $derived.by(() => {
    const c: Record<Level, number> = { error: 0, warn: 0, info: 0, log: 0, debug: 0 };
    for (const e of entries) if (e.kind === 'log') c[e.group]++;
    return c;
  });

  const filtered = $derived(query.trim() !== '' || LEVELS.some((l) => !enabled[l]));

  const visible = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!filtered) return entries;

    return entries.filter((e) =>
      e.kind === 'system' ? !q : enabled[e.group] && (!q || e.search.includes(q))
    );
  });

  // Stick to the bottom while following; scrolling up stops following.
  $effect(() => {
    void visible;
    if (follow && viewport) viewport.scrollTop = viewport.scrollHeight;
  });

  function groupOf(level: string): Level {
    const l = level.toLowerCase();
    if (l === 'error' || l === 'fatal') return 'error';
    if (l === 'warn' || l === 'warning') return 'warn';
    if (l === 'info') return 'info';
    if (l === 'debug' || l === 'trace') return 'debug';
    return 'log';
  }

  function makeEntry(kind: Entry['kind'], date: number, level: string, message: string, tone?: Tone): Entry {
    const text = stripAnsi(message);

    return {
      id: nextId++,
      kind,
      date,
      level,
      group: groupOf(level),
      tone,
      search: text.toLowerCase(),
      text,
      segments: parseAnsi(message)
    };
  }

  function parseMessage(data: unknown): Entry {
    let date = Date.now();
    let level = 'log';
    let message = typeof data === 'string' ? data : '[binary message]';

    try {
      const parsed = JSON.parse(message);

      if (parsed && typeof parsed === 'object' && typeof parsed.message === 'string') {
        message = parsed.message;
        if (typeof parsed.level === 'string') level = parsed.level;
        if (typeof parsed.date === 'number') date = parsed.date;
      }
    } catch {
      // Not JSON: show the raw frame.
    }

    return makeEntry('log', date, level, message);
  }

  // Logs can arrive in bursts: batch them into one update per frame.
  function enqueue(entry: Entry) {
    queue.push(entry);
    if (!frame) frame = requestAnimationFrame(flush);
  }

  function flush() {
    frame = 0;
    const batch = queue;
    queue = [];

    if (paused) {
      held = cap([...held, ...batch]);
    } else {
      entries = cap([...entries, ...batch]);
    }
  }

  function cap(list: Entry[]): Entry[] {
    if (list.length <= MAX_ENTRIES) return list;
    trimmed = true;
    return list.slice(-MAX_ENTRIES);
  }

  function system(message: string, tone: Tone) {
    enqueue(makeEntry('system', Date.now(), 'system', message, tone));
  }

  function socketUrl(): string {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${location.host}/api/v1/workers/${worker.id}/ws-logs`;
  }

  // The WebSocket handshake can't refresh an expired access cookie, but any API
  // request does (hooks.server.ts). Returns false once the session is gone.
  async function ensureSession(): Promise<boolean> {
    try {
      const res = await fetch('/api/v1/profile');
      return res.status !== 401;
    } catch {
      return true; // Network trouble: let the socket attempt fail and retry.
    }
  }

  async function connect(isRetry: boolean) {
    clearTimeout(retryTimer);
    reconnectWhenVisible = false;
    closedReason = null;
    status = isRetry ? 'reconnecting' : 'connecting';

    if (isRetry && !(await ensureSession())) {
      if (!disposed) stop('Your session has expired. Sign in again to resume the stream.');
      return;
    }

    if (disposed) return;

    const ws = new WebSocket(socketUrl());
    socket = ws;

    ws.onopen = () => {
      openedAt = Date.now();
      status = 'live';
      system('Connected, streaming logs', 'ok');
    };

    ws.onmessage = (event) => enqueue(parseMessage(event.data));

    // onerror is always followed by onclose, which handles everything.
    ws.onclose = (event) => {
      if (socket !== ws) return;
      socket = null;
      handleClose(event);
    };
  }

  function handleClose(event: CloseEvent) {
    const wasOpen = openedAt > 0;
    if (wasOpen && Date.now() - openedAt >= STABLE_MS) attempt = 0;
    openedAt = 0;

    if (wasOpen) {
      system(event.reason ? `Disconnected (${event.reason})` : 'Disconnected', 'warn');
    }

    if (attempt >= RETRY_DELAYS.length) {
      stop('Could not reach the log service.');
      return;
    }

    status = 'reconnecting';
    const delay = RETRY_DELAYS[attempt++];

    // No point reconnecting a tab nobody is looking at; resume when it's back.
    if (document.hidden) {
      reconnectWhenVisible = true;
    } else {
      retryTimer = setTimeout(() => connect(true), delay);
    }
  }

  function stop(reason: string) {
    status = 'closed';
    closedReason = reason;
    system(reason, 'error');
  }

  function reconnect() {
    attempt = 0;
    connect(true);
  }

  function onVisibilityChange() {
    if (!document.hidden && reconnectWhenVisible) connect(true);
  }

  onMount(() => {
    connect(false);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibilityChange);

      const ws = socket;
      socket = null;
      ws?.close();
    };
  });

  function onScroll() {
    if (!viewport) return;
    const distance = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    follow = distance < 24;
  }

  function jumpToLatest() {
    follow = true;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }

  function togglePause() {
    if (paused) {
      entries = cap([...entries, ...held]);
      held = [];
      paused = false;
      jumpToLatest();
    } else {
      paused = true;
    }
  }

  function clear() {
    entries = [];
    held = [];
    trimmed = false;
  }

  function toggleLevel(level: Level) {
    enabled = { ...enabled, [level]: !enabled[level] };
  }

  function soloLevel(level: Level) {
    const only = LEVELS.every((l) => enabled[l] === (l === level));
    enabled = Object.fromEntries(LEVELS.map((l) => [l, only || l === level])) as Record<Level, boolean>;
  }

  function download() {
    const lines = visible.map((e) =>
      e.kind === 'system'
        ? `${new Date(e.date).toISOString()} -- ${e.text}`
        : `${new Date(e.date).toISOString()} [${e.level}] ${e.text}`
    );

    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${worker.name ?? worker.id}-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const pad = (n: number, w = 2) => String(n).padStart(w, '0');

  function time(date: number): string {
    const d = new Date(date);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
  }

  function segmentStyle(s: AnsiSegment): string | undefined {
    const parts: string[] = [];
    if (s.fg) parts.push(`color:${s.fg}`);
    if (s.bg) parts.push(`background-color:${s.bg}`);
    if (s.bold) parts.push('font-weight:600');
    if (s.dim) parts.push('opacity:0.7');
    if (s.italic) parts.push('font-style:italic');
    if (s.underline) parts.push('text-decoration:underline');
    return parts.length ? parts.join(';') : undefined;
  }

  const LEVEL_TEXT: Record<Level, string> = {
    error: 'text-red-500',
    warn: 'text-amber-500',
    info: 'text-sky-500',
    log: 'text-foreground/70',
    debug: 'text-muted-foreground'
  };

  const LEVEL_ROW: Partial<Record<Level, string>> = {
    error: 'bg-red-500/10',
    warn: 'bg-amber-500/10'
  };

  const TONE_TEXT: Record<Tone, string> = {
    ok: 'text-green-600 dark:text-green-500',
    warn: 'text-amber-600 dark:text-amber-500',
    error: 'text-red-500'
  };

  const STATUS: Record<Status, { label: string; dot: string }> = {
    connecting: { label: 'Connecting', dot: 'bg-amber-500 animate-pulse' },
    live: { label: 'Live', dot: 'bg-green-500 animate-pulse' },
    reconnecting: { label: 'Reconnecting', dot: 'bg-amber-500 animate-pulse' },
    closed: { label: 'Disconnected', dot: 'bg-red-500' }
  };
</script>

<div class="flex h-full min-h-[32rem] flex-col">
<PageHeader title={worker.name ?? 'Worker'} description="Live logs">
  {#snippet actions()}
    <Button variant="outline" href={`/worker/${worker.id}`}>Back</Button>
    <Button variant="outline" href={`/worker/${worker.id}/edit`}>
      <Code class="size-4" />
      Edit code
    </Button>
  {/snippet}
</PageHeader>

<div class="flex min-h-0 flex-1 flex-col gap-3 p-8">
  <div class="flex flex-wrap items-center gap-2">
    <div
      class="flex h-8 items-center gap-2 rounded-md border px-3 text-sm"
      title={closedReason ?? undefined}
    >
      <span class={cn('size-2 rounded-full', STATUS[status].dot)}></span>
      {STATUS[status].label}
    </div>

    {#if status === 'closed'}
      <Button variant="outline" size="sm" class="h-8" onclick={reconnect}>
        <RotateCw class="size-3.5" />
        Reconnect
      </Button>
    {/if}

    <div class="flex items-center gap-1" role="group" aria-label="Filter by level">
      {#each LEVELS as level (level)}
        <button
          type="button"
          class={cn(
            'flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium capitalize transition-colors',
            enabled[level]
              ? 'bg-secondary text-secondary-foreground'
              : 'text-muted-foreground border-dashed opacity-60 hover:opacity-100'
          )}
          aria-pressed={enabled[level]}
          title="Click to toggle, double-click to show only this level"
          onclick={() => toggleLevel(level)}
          ondblclick={() => soloLevel(level)}
        >
          <span class={LEVEL_TEXT[level]}>{level}</span>
          <span class="text-muted-foreground tabular-nums">{counts[level]}</span>
        </button>
      {/each}
    </div>

    <div class="ml-auto flex items-center gap-2">
      <div class="relative">
        <Search class="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input bind:value={query} placeholder="Search logs" class="h-8 w-56 pl-8" aria-label="Search logs" />
      </div>

      <Button variant="outline" size="sm" class="h-8" onclick={togglePause}>
        {#if paused}
          <Play class="size-3.5" />
          Resume
        {:else}
          <Pause class="size-3.5" />
          Pause
        {/if}
      </Button>

      <Button
        variant="outline"
        size="icon-sm"
        class="size-8"
        onclick={download}
        disabled={visible.length === 0}
        aria-label="Download logs"
        title="Download the lines shown"
      >
        <Download class="size-3.5" />
      </Button>

      <Button
        variant="outline"
        size="icon-sm"
        class="size-8"
        onclick={clear}
        disabled={entries.length === 0 && held.length === 0}
        aria-label="Clear logs"
        title="Clear"
      >
        <Trash2 class="size-3.5" />
      </Button>
    </div>
  </div>

  <div class="bg-card relative min-h-0 flex-1 overflow-hidden rounded-lg border">
    <div
      bind:this={viewport}
      onscroll={onScroll}
      class="h-full overflow-y-auto py-2 font-mono text-xs leading-5"
      role="log"
      aria-live="off"
    >
      {#if trimmed}
        <p class="text-muted-foreground px-4 pb-1 italic">
          Older lines were dropped, only the latest {MAX_ENTRIES} are kept.
        </p>
      {/if}

      {#each visible as entry (entry.id)}
        {#if entry.kind === 'system'}
          <div class={cn('flex gap-3 px-4 italic', TONE_TEXT[entry.tone ?? 'ok'])}>
            <time class="shrink-0 tabular-nums opacity-70" datetime={new Date(entry.date).toISOString()}>
              {time(entry.date)}
            </time>
            <span class="w-12 shrink-0">--</span>
            <span class="min-w-0 flex-1">{entry.text}</span>
          </div>
        {:else}
          <div class={cn('hover:bg-muted/60 flex gap-3 px-4', LEVEL_ROW[entry.group])}>
            <time
              class="text-muted-foreground shrink-0 tabular-nums"
              datetime={new Date(entry.date).toISOString()}
              title={new Date(entry.date).toLocaleString()}
            >
              {time(entry.date)}
            </time>
            <span class={cn('w-12 shrink-0 truncate uppercase', LEVEL_TEXT[entry.group])}>{entry.level}</span>
            <span class="min-w-0 flex-1 break-words whitespace-pre-wrap"
              >{#each entry.segments as s, i (i)}<span style={segmentStyle(s)}>{s.text}</span>{/each}</span
            >
          </div>
        {/if}
      {:else}
        <div
          class="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-1 font-sans text-sm"
        >
          {#if entries.length > 0}
            <p>No lines match the current filters.</p>
          {:else if status === 'live'}
            <p class="text-foreground">Waiting for logs…</p>
            <p>Requests to this worker will show up here as they happen.</p>
          {:else if status === 'closed'}
            <p>{closedReason}</p>
          {:else}
            <p>Connecting to the log stream…</p>
          {/if}
        </div>
      {/each}
    </div>

    {#if paused && held.length > 0}
      <button
        type="button"
        class="bg-primary text-primary-foreground absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-md"
        onclick={togglePause}
      >
        <Play class="size-3.5" />
        {held.length} new {held.length === 1 ? 'line' : 'lines'}, resume
      </button>
    {:else if !follow && visible.length > 0}
      <button
        type="button"
        class="bg-primary text-primary-foreground absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-md"
        onclick={jumpToLatest}
      >
        <ArrowDown class="size-3.5" />
        Jump to latest
      </button>
    {/if}
  </div>
</div>
</div>
