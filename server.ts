/**
 * Production server entrypoint with graceful shutdown support
 *
 * This file is used for:
 * - Production runtime (bun server.ts)
 * - Compiled binary (bun run compile)
 *
 * It explicitly creates a Bun server to handle SIGTERM/SIGINT signals
 * for graceful shutdown (Docker, Ctrl+C, process managers).
 *
 * For development, use `bun --hot src/index.ts` which relies on
 * the default export and lets Bun handle hot reload lifecycle.
 */
import app from './src';

const server = Bun.serve(app);

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.stop(true);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.stop(true);
});
