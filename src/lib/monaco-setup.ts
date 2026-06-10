// Client-only Monaco bootstrap. This module must ONLY ever be loaded through a
// dynamic import() from the browser (onMount): it touches `self`, pulls the
// monaco bundle and its web workers — none of which may enter the SSR graph.
//
// TODO: the full 'monaco-editor' entry makes Vite also emit the css/html/json
// workers (~2.1 MB of dead client assets — getWorker below never spawns them).
// Switching to the slim editor.api + typescript contribution imports would
// drop them; deferred until the editor is runtime-validated.
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

// Workers runtime declarations, inlined at build time via ?raw. The Angular
// dash copied the same 12 files to /assets/workers-types and fetched them at
// runtime; ?raw skips the asset copy + network round-trip. globals.d.ts is
// intentionally omitted, as in the dash.
import eventsDts from '@openworkers/workers-types/types/events.d.ts?raw';
import abortDts from '@openworkers/workers-types/types/abort.d.ts?raw';
import streamsDts from '@openworkers/workers-types/types/streams.d.ts?raw';
import blobDts from '@openworkers/workers-types/types/blob.d.ts?raw';
import urlDts from '@openworkers/workers-types/types/url.d.ts?raw';
import fetchDts from '@openworkers/workers-types/types/fetch.d.ts?raw';
import encodingDts from '@openworkers/workers-types/types/encoding.d.ts?raw';
import cryptoDts from '@openworkers/workers-types/types/crypto.d.ts?raw';
import consoleDts from '@openworkers/workers-types/types/console.d.ts?raw';
import timersDts from '@openworkers/workers-types/types/timers.d.ts?raw';
import workersDts from '@openworkers/workers-types/types/workers.d.ts?raw';
import bindingsDts from '@openworkers/workers-types/types/bindings.d.ts?raw';

export type EnvValue = {
  key: string;
  type: 'var' | 'secret' | 'assets' | 'storage' | 'kv' | 'database' | 'worker';
};

const WORKERS_TYPES_LIB = [
  eventsDts,
  abortDts,
  streamsDts,
  blobDts,
  urlDts,
  fetchDts,
  encodingDts,
  cryptoDts,
  consoleDts,
  timersDts,
  workersDts,
  bindingsDts
].join('\n');

let bootstrapped = false;

export function setupMonaco(): typeof monaco {
  self.MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      return label === 'typescript' || label === 'javascript' ? new TsWorker() : new EditorWorker();
    }
  };

  // Inject the runtime types once per app lifetime (same module-level guard as
  // the dash) to avoid duplicate libs when navigating between workers.
  if (!bootstrapped) {
    bootstrapped = true;

    // monaco 0.55 moved the language APIs from monaco.languages.typescript to
    // a top-level `typescript` namespace.
    const compilerOptions = {
      target: monaco.typescript.ScriptTarget.ESNext,
      lib: ['esnext'],
      allowNonTsExtensions: true,
      types: []
    };

    monaco.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
    monaco.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);

    // Registered on BOTH defaults so javascript and typescript workers get
    // the same completions.
    monaco.typescript.typescriptDefaults.addExtraLib(WORKERS_TYPES_LIB);
    monaco.typescript.javascriptDefaults.addExtraLib(WORKERS_TYPES_LIB);
  }

  return monaco;
}

// --- Environment IntelliSense (`declare var env`) -------------------------
// Ported verbatim from the dash's editor.libs.ts: binding kinds map to the
// ambient Binding* interfaces declared in bindings.d.ts, vars/secrets to string.

export function createEnvironmentLib(values: EnvValue[]): string {
  if (!values.length) {
    return `declare var env: {};`;
  }

  const members = values.map((v) => {
    switch (v.type) {
      case 'assets':
        return `readonly ${v.key}: BindingAssets`;
      case 'storage':
        return `readonly ${v.key}: BindingStorage`;
      case 'kv':
        return `readonly ${v.key}: BindingKV`;
      case 'database':
        return `readonly ${v.key}: BindingDatabase`;
      case 'worker':
        return `readonly ${v.key}: BindingWorker`;
      default:
        return `readonly ${v.key}: string`;
    }
  });

  return `
interface Environment {
  ${members.join(';\n  ')}
}

declare var env: Environment;`;
}

export function createEnvType(values: EnvValue[]): string {
  if (!values.length) {
    return `type Env = {};`;
  }

  const members = values.map((v) => {
    switch (v.type) {
      case 'assets':
        return `readonly ${v.key}: BindingAssets`;
      case 'storage':
        return `readonly ${v.key}: BindingStorage`;
      case 'kv':
        return `readonly ${v.key}: BindingKV`;
      case 'database':
        return `readonly ${v.key}: BindingDatabase`;
      case 'worker':
        return `readonly ${v.key}: BindingWorker`;
      default:
        return `readonly ${v.key}: string`;
    }
  });

  return `
type Env = {
  ${members.join(';\n  ')}
};`;
}

// Per-worker env libs are replaced (disposed + re-added) when the editor
// mounts for a different worker — unlike the runtime types above, these vary.
let environmentLibs: monaco.IDisposable[] = [];

export function setEnvironmentLibs(values: EnvValue[]): void {
  for (const lib of environmentLibs) {
    lib.dispose();
  }

  const envLib = createEnvironmentLib(values);
  const envType = createEnvType(values);

  environmentLibs = [
    monaco.typescript.typescriptDefaults.addExtraLib(envLib),
    monaco.typescript.javascriptDefaults.addExtraLib(envLib),
    monaco.typescript.typescriptDefaults.addExtraLib(envType),
    monaco.typescript.javascriptDefaults.addExtraLib(envType)
  ];
}

// Called when the editor unmounts (the dash did this in ngOnDestroy) so a
// worker's env typings don't linger in the global defaults.
export function clearEnvironmentLibs(): void {
  for (const lib of environmentLibs) {
    lib.dispose();
  }

  environmentLibs = [];
}
