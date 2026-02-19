import { Server } from './.svelte-kit/output/server/index.js';
import { manifest } from './.svelte-kit/output/server/manifest.js';

// @ts-expect-error generated manifest diverges from SSRManifest (missing matcher on RouteParam)
const server = new Server(manifest);

await server.init({ env: process.env as Record<string, string> });

const port = parseInt(process.env.PORT || '7000', 10);

const instance = Bun.serve({
  port,
  fetch: (req) =>
    server.respond(req, {
      getClientAddress: () =>
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || ''
    })
});

console.log(`Listening on ${instance.url}`);

process.on('SIGTERM', () => instance.stop(true));
process.on('SIGINT', () => instance.stop(true));
