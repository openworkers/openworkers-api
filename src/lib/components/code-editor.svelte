<script lang="ts">
  import { onMount } from 'svelte';
  import type * as Monaco from 'monaco-editor';
  import type { EnvValue } from '$lib/monaco-setup';
  import { theme } from '$lib/theme.svelte';

  let {
    value = $bindable(''),
    language = 'javascript',
    envValues = [],
    onsave,
    class: className = ''
  }: {
    value?: string;
    language?: 'javascript' | 'typescript';
    // Applied once at mount — the editor is remounted per worker ({#key} in the
    // page), which is what keeps these fresh.
    envValues?: EnvValue[];
    onsave?: () => void;
    class?: string;
  } = $props();

  let container: HTMLDivElement;
  // $state.raw: reassignment is reactive (the effects below re-run when the
  // editor becomes ready) without deep-proxying monaco's internals.
  let monacoNs = $state.raw<typeof Monaco | null>(null);
  let editor = $state.raw<Monaco.editor.IStandaloneCodeEditor | null>(null);

  onMount(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      // Monaco never enters the SSR graph — loaded only here, in the browser.
      const { setupMonaco, setEnvironmentLibs, clearEnvironmentLibs } = await import(
        '$lib/monaco-setup'
      );
      const monaco = setupMonaco();

      if (cancelled) {
        return;
      }

      setEnvironmentLibs(envValues);

      // Same construction options as the dash's EDITOR_OPTIONS.
      const instance = monaco.editor.create(container, {
        value,
        language,
        theme: theme.value === 'dark' ? 'vs-dark' : 'vs',
        minimap: { enabled: false },
        padding: { top: 10, bottom: 5 },
        tabSize: 2,
        insertSpaces: true,
        automaticLayout: true
      });

      instance.onDidChangeModelContent(() => {
        value = instance.getValue();
      });

      // Cmd+S / Ctrl+S saves+deploys, as in the dash.
      instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => onsave?.());

      cleanup = () => {
        instance.dispose();
        // The dash disposed its env libs in ngOnDestroy — same contract here.
        clearEnvironmentLibs();
      };

      editor = instance;
      monacoNs = monaco;
    })();

    return () => {
      cancelled = true;
      cleanup?.();
      editor = null;
      monacoNs = null;
    };
  });

  // Push external value changes (e.g. a reset from the parent) into the editor;
  // edits coming FROM the editor are equal to value, so this no-ops for them.
  $effect(() => {
    if (editor && value !== editor.getValue()) {
      editor.setValue(value);
    }
  });

  // Follow the app theme. (The dash passed 'light' here by mistake — 'vs' is
  // the actual light theme name; monaco silently fell back to it.)
  $effect(() => {
    monacoNs?.editor.setTheme(theme.value === 'dark' ? 'vs-dark' : 'vs');
  });
</script>

<div bind:this={container} class={className}></div>
