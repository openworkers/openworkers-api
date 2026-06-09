import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

/**
 * Vite plugin to inline croner WASM binary into the bundle.
 * Replicates the esbuild wasmInlinePlugin from worker.compile.ts:
 * reads the .wasm binary, base64-encodes it, and emits JS that
 * compiles + instantiates the module at runtime.
 */
function cronerWasmInlinePlugin(): Plugin {
  return {
    name: 'croner-wasm-inline',
    enforce: 'pre',

    resolveId(id) {
      if (id === '@openworkers/croner-wasm') {
        return '\0croner-wasm-inline';
      }
    },

    load(id) {
      if (id !== '\0croner-wasm-inline') return;

      const wasmPath = resolve('./node_modules/@openworkers/croner-wasm/dist/bundler/croner_wasm_bg.wasm');
      const bgJsPath = resolve('./node_modules/@openworkers/croner-wasm/dist/bundler/croner_wasm_bg.js');

      const wasmBytes = readFileSync(wasmPath);
      const base64 = wasmBytes.toString('base64');

      // Discover WASM imports at build time
      const wasmModule = new WebAssembly.Module(wasmBytes);
      const imports = WebAssembly.Module.imports(wasmModule);
      const importNames = imports.filter((i) => i.module === './croner_wasm_bg.js').map((i) => i.name);

      return `
        import {
          ${importNames.join(',\n          ')},
          __wbg_set_wasm,
          WasmCron,
          parseAndDescribe,
        } from ${JSON.stringify(bgJsPath)};

        const _base64 = "${base64}";
        const _bytes = Uint8Array.from(atob(_base64), c => c.charCodeAt(0));
        const _module = new WebAssembly.Module(_bytes);
        const _instance = new WebAssembly.Instance(_module, {
          "./croner_wasm_bg.js": { ${importNames.join(', ')} }
        });

        __wbg_set_wasm(_instance.exports);
        _instance.exports.__wbindgen_start();

        export { WasmCron, parseAndDescribe };
      `;
    }
  };
}

/**
 * Override zod locales to only include English (saves ~50KB per worker).
 */
function zodLocalesPlugin(): Plugin {
  return {
    name: 'zod-locales-en-only',
    enforce: 'pre',

    resolveId(id) {
      if (id === 'zod/v4/locales' || id.endsWith('/zod/v4/locales/index.js')) {
        return '\0zod-locales-en';
      }
    },

    load(id) {
      if (id !== '\0zod-locales-en') return;
      return `export { default as en } from "zod/v4/locales/en.js";`;
    }
  };
}

const envPort = process.env.PORT;
if (!/^\d{1,5}$/.test(envPort || '')) {
  console.warn(`Warning: Invalid PORT environment variable "${envPort}", defaulting to 5173`);
}

export default defineConfig({
  plugins: [cronerWasmInlinePlugin(), zodLocalesPlugin(), tailwindcss(), sveltekit()],
  server: {
    port: parseInt(process.env.PORT || '5173', 10)
  }
});
