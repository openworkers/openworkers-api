import { rmSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { build, type Plugin } from 'esbuild';
import { version, name } from './package.json';

const ANALYZE = process.argv.includes('--analyze');

console.log(`${name} - Version: ${version}`);

// Clear existing build
rmSync('./dist', { recursive: true, force: true });

console.log(ANALYZE ? 'Analyzing bundle...' : 'Building worker...');

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

const result = await build({
  entryPoints: ['./worker.ts'],
  bundle: true,
  outfile: './dist/worker.js',
  format: 'esm',
  platform: 'browser',
  minify: true,
  sourcemap: 'external',
  conditions: ['default'],
  plugins: [wasmInlinePlugin],
  logLevel: ANALYZE ? 'silent' : 'info',
  metafile: ANALYZE
});

if (ANALYZE && result.metafile) {
  const outputs = result.metafile.outputs;
  const mainOutput = outputs['dist/worker.js'];

  if (mainOutput) {
    const inputs = Object.entries(mainOutput.inputs)
      .map(([path, info]) => ({
        path: path.replace(process.cwd() + '/', ''),
        bytes: info.bytesInOutput
      }))
      .sort((a, b) => b.bytes - a.bytes);

    const totalBytes = inputs.reduce((sum, i) => sum + i.bytes, 0);

    console.log(`\nTotal bundle size: ${(totalBytes / 1024).toFixed(1)} KB\n`);
    console.log('Top 20 largest dependencies:\n');

    inputs.slice(0, 20).forEach((input, i) => {
      const sizeKB = (input.bytes / 1024).toFixed(1);
      const percent = ((input.bytes / totalBytes) * 100).toFixed(1);
      console.log(`${(i + 1).toString().padStart(2)}. ${sizeKB.padStart(6)} KB (${percent.padStart(5)}%) ${input.path}`);
    });

    const categories = { 'node_modules': 0, 'src': 0, 'other': 0 };
    inputs.forEach(input => {
      if (input.path.startsWith('node_modules/')) categories['node_modules'] += input.bytes;
      else if (input.path.startsWith('src/')) categories['src'] += input.bytes;
      else categories['other'] += input.bytes;
    });

    console.log('\nBy category:\n');
    Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, bytes]) => {
        const sizeKB = (bytes / 1024).toFixed(1);
        const percent = ((bytes / totalBytes) * 100).toFixed(1);
        console.log(`${cat.padEnd(15)}: ${sizeKB.padStart(6)} KB (${percent.padStart(5)}%)`);
      });

    writeFileSync('./dist/metafile.json', JSON.stringify(result.metafile, null, 2));
    console.log('\n✅ Detailed metafile saved to dist/metafile.json');
  }
}

console.log('\nBuild completed.');
