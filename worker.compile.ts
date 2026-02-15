import { rmSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { build, type Plugin } from 'esbuild';
import { version, name } from './package.json';

console.log(`${name} - Version: ${version}`);

// Clear existing build
rmSync('./dist', { recursive: true, force: true });

console.log('Building worker...');

// override node_modules/zod/v4/locales/index.js
writeFileSync('./node_modules/zod/v4/locales/index.js', 'export { default as en } from "./en.js";');

// Plugin to inline croner WASM binary into the bundle.
// Uses the bundler target's bg.js (no import.meta.url) and manually
// compiles/instantiates the WASM with the correct import bindings.
const wasmInlinePlugin: Plugin = {
  name: 'croner-wasm-inline',
  setup(build) {
    build.onResolve({ filter: /^@openworkers\/croner-wasm$/ }, () => ({
      path: 'croner-wasm-inline',
      namespace: 'croner-wasm-inline',
    }));

    build.onLoad({ filter: /.*/, namespace: 'croner-wasm-inline' }, () => {
      // Use the bundler target (no import.meta.url references)
      const wasmPath = resolve('./node_modules/@openworkers/croner-wasm/dist/bundler/croner_wasm_bg.wasm');
      const bgJsPath = resolve('./node_modules/@openworkers/croner-wasm/dist/bundler/croner_wasm_bg.js');

      const wasmBytes = readFileSync(wasmPath);
      const base64 = wasmBytes.toString('base64');

      // Discover WASM imports at build time
      const wasmModule = new WebAssembly.Module(wasmBytes);
      const imports = WebAssembly.Module.imports(wasmModule);
      const importNames = imports
        .filter(i => i.module === './croner_wasm_bg.js')
        .map(i => i.name);

      return {
        contents: `
          import {
            ${importNames.join(',\n            ')},
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
        `,
        loader: 'js',
        resolveDir: process.cwd(),
      };
    });
  }
};

await build({
  entryPoints: ['./worker.ts'],
  bundle: true,
  outfile: './dist/worker.js',
  format: 'esm',
  platform: 'browser',
  minify: true,
  sourcemap: 'external',
  conditions: ['default'],
  plugins: [wasmInlinePlugin],
  logLevel: 'info'
});

console.log('Build completed.');
