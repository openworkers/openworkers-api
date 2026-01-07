// Portable password hashing using Web Crypto API (PBKDF2)
// Works in Workers runtime (no Bun/Node dependencies)

const ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 16; // 128 bits

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }

  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    KEY_LENGTH * 8
  );

  // Format: iterations$salt$hash (all base64)
  const saltB64 = arrayBufferToBase64(salt.buffer);
  const hashB64 = arrayBufferToBase64(derivedBits);

  return `${ITERATIONS}$${saltB64}$${hashB64}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split('$');

    if (parts.length !== 3) {
      return false;
    }

    const iterationsStr = parts[0]!;
    const saltB64 = parts[1]!;
    const hashB64 = parts[2]!;
    const iterations = parseInt(iterationsStr, 10);

    if (!iterations) {
      return false;
    }

    const encoder = new TextEncoder();
    const salt = new Uint8Array(base64ToArrayBuffer(saltB64));
    const expectedHash = base64ToArrayBuffer(hashB64);

    const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      KEY_LENGTH * 8
    );

    // Constant-time comparison
    const derived = new Uint8Array(derivedBits);
    const expected = new Uint8Array(expectedHash);

    if (derived.length !== expected.length) {
      return false;
    }

    let result = 0;

    for (let i = 0; i < derived.length; i++) {
      result |= derived[i]! ^ expected[i]!;
    }

    return result === 0;
  } catch {
    return false;
  }
}
