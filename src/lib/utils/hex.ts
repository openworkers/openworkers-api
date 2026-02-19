/**
 * Hex encoding/decoding utilities.
 * Inspired by b4a (https://github.com/holepunchto/b4a)
 */

function hexValue(char: number): number | undefined {
  if (char >= 0x30 && char <= 0x39) return char - 0x30;
  if (char >= 0x41 && char <= 0x46) return char - 0x41 + 10;
  if (char >= 0x61 && char <= 0x66) return char - 0x61 + 10;
}

/**
 * Calculate the byte length of a hex string.
 */
export function hexByteLength(hex: string): number {
  return hex.length >>> 1;
}

/**
 * Decode a hex string to Uint8Array.
 */
export function hexDecode(hex: string): Uint8Array {
  const len = hexByteLength(hex);
  const buffer = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    const a = hexValue(hex.charCodeAt(i * 2));
    const b = hexValue(hex.charCodeAt(i * 2 + 1));

    if (a === undefined || b === undefined) {
      return buffer.subarray(0, i);
    }

    buffer[i] = (a << 4) | b;
  }

  return buffer;
}

/**
 * Encode Uint8Array to hex string.
 */
export function hexEncode(buffer: Uint8Array): string {
  const len = buffer.byteLength;
  const view = new DataView(buffer.buffer, buffer.byteOffset, len);

  let result = '';
  let i = 0;

  for (const n = len - (len % 4); i < n; i += 4) {
    result += view.getUint32(i).toString(16).padStart(8, '0');
  }

  for (; i < len; i++) {
    result += view.getUint8(i).toString(16).padStart(2, '0');
  }

  return result;
}
