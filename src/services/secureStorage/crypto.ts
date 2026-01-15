// Web Crypto API helpers for secure storage

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const PBKDF2_ITERATIONS = 100000;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

/**
 * Generate a non-extractable AES-GCM key for encryption
 */
export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // non-extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Derive a key from password using PBKDF2
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // non-extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate random salt for PBKDF2 key derivation
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Generate random initialization vector for AES-GCM
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Encrypt string data with AES-GCM
 * Returns base64 encoded string: IV + ciphertext
 */
export async function encrypt(data: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = generateIV();

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
    key,
    encoder.encode(data)
  );

  // Combine IV and ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt base64 encoded string (IV + ciphertext) with AES-GCM
 */
export async function decrypt(encrypted: string, key: CryptoKey): Promise<string> {
  // Decode base64
  const combined = new Uint8Array(
    atob(encrypted).split('').map(c => c.charCodeAt(0))
  );

  // Extract IV and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Export key for IndexedDB storage (only for browser-generated keys)
 */
export async function exportKey(key: CryptoKey): Promise<JsonWebKey> {
  // This only works for extractable keys
  return crypto.subtle.exportKey('jwk', key);
}

/**
 * Import key from JWK format
 */
export async function importKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: ALGORITHM },
    false, // non-extractable after import
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate an extractable key (for storage in IndexedDB)
 */
export async function generateExtractableKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true, // extractable for storage
    ['encrypt', 'decrypt']
  );
}
