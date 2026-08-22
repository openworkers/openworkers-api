/// <reference types="@openworkers/workers-types" />

import { hexEncode } from './hex';

/**
 * SHA-256 hash using Web Crypto API (works in workers, Bun, and browsers).
 */
export async function sha256Hex(input: string): Promise<string> {
  return sha256HexUint8(new TextEncoder().encode(input));
}

export async function sha256HexUint8(input: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', input as BufferSource);

  return hexEncode(new Uint8Array(hashBuffer));
}
