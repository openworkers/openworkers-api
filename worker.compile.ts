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

// Plugin to inline croner WASM binary into the bundle
const wasmInlinePlugin: Plugin = {
  name: 'croner-wasm-inline',
  setup(build) {
    // Intercept bare @openworkers/croner-wasm import
    build.onResolve({ filter: /^@openworkers\/croner-wasm$/ }, () => ({
      path: 'croner-wasm-inline',
      namespace: 'croner-wasm-inline',
    }));

    build.onLoad({ filter: /.*/, namespace: 'croner-wasm-inline' }, () => {
      // Read the WASM binary (web target) and encode as base64
      const wasmPath = resolve('./node_modules/@openworkers/croner-wasm/dist/croner_wasm_bg.wasm');
      const wasmBytes = readFileSync(wasmPath);
      const base64 = wasmBytes.toString('base64');

      // Import from the web target's JS (has initSync + all exports)
      const jsPath = resolve('./node_modules/@openworkers/croner-wasm/dist/croner_wasm.js');

      return {
        contents: `
          import { initSync, WasmCron, parseAndDescribe } from ${JSON.stringify(jsPath)};

          const base64 = "${base64}";
          const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
          initSync({ module: bytes });

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
