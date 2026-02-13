/**
 * Base64 encoding/decoding utilities for cross-platform compatibility.
 *
 * Why not use atob()?
 * - atob() returns a string, not bytes
 * - JavaScript strings are UTF-16, so charCodeAt() can return wrong values
 *   for binary data (values > 127 get mangled)
 *
 * This implementation works on Node, Bun, Cloudflare Workers, and browsers.
 * Inspired by b4a (https://github.com/holepunchto/b4a)
 */

// Base64 alphabet (standard + URL-safe variants)
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const b64char = (i: number) => ALPHABET[i]!;

// Lookup table: ASCII code -> 6-bit value
const CODES = new Uint8Array(256);

for (let i = 0; i < ALPHABET.length; i++) {
  CODES[ALPHABET.charCodeAt(i)] = i;
}

// URL-safe base64 variants
CODES[0x2d] = 62; // '-' maps to same as '+'
CODES[0x5f] = 63; // '_' maps to same as '/'

/**
 * Calculate the byte length of a base64-encoded string.
 */
export function base64ByteLength(base64: string): number {
  let len = base64.length;

  // Account for padding
  if (base64.charCodeAt(len - 1) === 0x3d) {
    len--;
  }

  if (len > 1 && base64.charCodeAt(len - 1) === 0x3d) {
    len--;
  }

  // Each 4 base64 chars = 3 bytes, using bit shift for integer division
  return (len * 3) >>> 2;
}

/**
 * Decode a base64 string to Uint8Array.
 *
 * Handles both standard base64 and URL-safe base64 (with - and _).
 */
export function base64Decode(base64: string): Uint8Array {
  const len = base64ByteLength(base64);
  const buffer = new Uint8Array(len);

  // Process 4 base64 chars at a time -> 3 bytes
  for (let i = 0, j = 0; j < len; i += 4) {
    const a = CODES[base64.charCodeAt(i)]!;
    const b = CODES[base64.charCodeAt(i + 1)]!;
    const c = CODES[base64.charCodeAt(i + 2)]!;
    const d = CODES[base64.charCodeAt(i + 3)]!;

    // Combine 4x 6-bit values into 3x 8-bit bytes
    buffer[j++] = (a << 2) | (b >> 4);
    buffer[j++] = ((b & 15) << 4) | (c >> 2);
    buffer[j++] = ((c & 3) << 6) | (d & 63);
  }

  return buffer;
}

/**
 * Encode Uint8Array to base64 string.
 */
export function base64Encode(buffer: Uint8Array): string {
  const len = buffer.byteLength;
  let result = '';

  // Process 3 bytes at a time -> 4 base64 chars
  for (let i = 0; i < len; i += 3) {
    const x = buffer[i]!;
    const y = buffer[i + 1]!;
    const z = buffer[i + 2]!;

    result +=
      b64char(x >> 2) +
      b64char(((x & 3) << 4) | (y >> 4)) +
      b64char(((y & 15) << 2) | (z >> 6)) +
      b64char(z & 63);
  }

  // Add padding if needed
  if (len % 3 === 2) {
    result = result.substring(0, result.length - 1) + '=';
  } else if (len % 3 === 1) {
    result = result.substring(0, result.length - 2) + '==';
  }

  return result;
}

/**
 * Encode a string to base64.
 */
export function stringToBase64(input: string): string {
  return base64Encode(new TextEncoder().encode(input));
}

/**
 * Decode bytes to a UTF-8 string.
 */
export function bytesToString(input: ArrayLike<number>): string {
  return new TextDecoder().decode(new Uint8Array(input));
}
