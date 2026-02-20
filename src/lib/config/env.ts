/**
 * Read an environment variable from worker runtime (globalThis.env) or Bun/Node (process.env).
 */
export function getEnv(key: string): string | undefined {
  if (typeof globalThis !== 'undefined' && (globalThis as any).env) {
    const val = (globalThis as any).env[key];

    if (val !== undefined) {
      return String(val);
    }
  }

  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }

  return undefined;
}
