/**
 * Password hashing using Web Crypto API (PBKDF2)
 * Compatible with Cloudflare Workers / Pages Functions
 */

// Generate a random salt
export function generateSalt(): string {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return arrayToHex(salt);
}

// Hash password with PBKDF2
export async function hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const useSalt = salt || generateSalt();
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(useSalt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return { hash: arrayToHex(new Uint8Array(hashBuffer)), salt: useSalt };
}

// Verify password against stored combined hash (format: 'salt:hash')
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length < 2) return false;
  const salt = parts[0];
  const hash = parts.slice(1).join(':');
  const { hash: computed } = await hashPassword(password, salt);
  return hash === computed;
}

function arrayToHex(arr: Uint8Array): string {
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}
