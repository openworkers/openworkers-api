import { rmSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';
import { version, name } from './package.json';

console.log(`${name} - Version: ${version}`);

// Clear existing build
rmSync('./dist', { recursive: true, force: true });

console.log('Building worker...');

// override node_modules/zod/v4/locales/index.js
writeFileSync('./node_modules/zod/v4/locales/index.js', 'export { default as en } from "./en.js";');

await build({
  entryPoints: ['./worker.ts'],
  bundle: true,
  outfile: './dist/worker.js',
  format: 'esm',
  platform: 'browser',
  minify: true,
  sourcemap: 'external',
  conditions: ['default'],
  logLevel: 'info'
});

console.log('Build completed.');
