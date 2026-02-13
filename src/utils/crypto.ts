/**
 * SHA-256 hash using Web Crypto API (works in workers, Bun, and browsers).
 */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);

  let hex = '';

  for (let i = 0; i < hashArray.length; i++) {
    hex += hashArray[i]!.toString(16).padStart(2, '0');
  }

  return hex;
}
