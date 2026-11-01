/**
 * Secure Random Utility
 *
 * Cryptographically secure random number generation for security-sensitive
 * identifiers. Uses expo-crypto's CSPRNG to replace Math.random() in:
 * - Device IDs
 * - Referral codes
 * - Transaction IDs
 * - Session tokens
 * - Any other identifier that needs collision-resistance or unpredictability
 */

import * as Crypto from 'expo-crypto';

/**
 * Generate a cryptographically secure random string.
 *
 * @param length - Number of characters to generate
 * @param charset - Characters to use (default: alphanumeric, no ambiguous chars)
 * @returns A random string of the specified length
 */
export function secureRandomString(
  length: number = 16,
  charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string {
  if (length <= 0) {
    throw new Error('Length must be greater than 0');
  }
  if (charset.length === 0) {
    throw new Error('Charset cannot be empty');
  }

  const charsetLen = charset.length;
  if (charsetLen > 256) {
    // Rejection sampling below draws single bytes, so a charset larger than
    // the byte range would make `maxValid` 0 and reject every byte forever.
    throw new Error('Charset cannot exceed 256 characters');
  }

  // Rejection sampling to avoid modulo bias: one byte per character, and any
  // byte at or above the largest multiple of charset.length is discarded.
  const maxValid = Math.floor(256 / charsetLen) * charsetLen;
  let result = '';
  let generated = 0;

  while (generated < length) {
    // Generate a full 32 bytes of entropy in one call (CSPRNG).
    const bytes = Crypto.getRandomValues(new Uint8Array(32));
    for (let i = 0; i < bytes.length && generated < length; i++) {
      const byte = bytes[i];
      if (byte === undefined) continue;
      // Reject bytes that would introduce modulo bias.
      if (byte < maxValid) {
        result += charset[byte % charsetLen];
        generated++;
      }
    }
  }

  return result;
}

/**
 * Generate a URL-safe, base64-encoded cryptographically secure random ID.
 * ~22 characters for 16 bytes of entropy.
 *
 * @param byteLength - Number of random bytes (default 16 = 128 bits)
 */
export function secureRandomId(byteLength: number = 16): string {
  const bytes = Crypto.getRandomValues(new Uint8Array(byteLength));
  // Convert to base64url
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte === undefined) continue;
    binary += String.fromCharCode(byte);
  }
  const base64 = typeof btoa !== 'undefined'
    ? btoa(binary)
    : Buffer.from(binary, 'binary').toString('base64');
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate a prefixed secure ID like "device_AbCdEf123...".
 */
export function prefixedSecureId(prefix: string, byteLength: number = 12): string {
  return `${prefix}_${secureRandomId(byteLength)}`;
}

/**
 * Generate a cryptographically secure 8-character alphanumeric referral code.
 * Uses a confusion-free charset (no I, O, 0, 1) to be human-readable.
 */
// The referral-code charset intentionally excludes visually ambiguous
// characters: 0, O, 1, I, AND L (which can be confused with 1, I, or lowercase l).
// 31 characters -> 5 bits per char -> referrer codes that are easy to read
// aloud over the phone.
const REFERRAL_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateSecureReferralCode(): string {
  return secureRandomString(8, REFERRAL_CHARSET);
}

/**
 * Return a cryptographically secure random index in `[0, length)`.
 * Rejection-samples bytes from the CSPRNG so no index is favored
 * (avoids the modulo bias of `Math.floor(Math.random() * length)`).
 *
 * @param length - Number of possible indices (must be <= 256)
 */
export function secureRandomIndex(length: number): number {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error('Length must be a positive integer');
  }
  if (length > 256) {
    throw new Error('Length cannot exceed 256 for single-byte sampling');
  }
  const maxValid = Math.floor(256 / length) * length;
  for (;;) {
    const byte = Crypto.getRandomValues(new Uint8Array(1))[0];
    if (byte === undefined) continue;
    if (byte < maxValid) return byte % length;
  }
}

/**
 * Cryptographically secure, unbiased Fisher–Yates shuffle.
 * Returns a NEW array; the input is not mutated.
 *
 * Unlike `arr.sort(() => Math.random() - 0.5)` — which produces a
 * non-uniform permutation that depends on the engine's sort algorithm —
 * Fisher–Yates gives every permutation equal probability.
 */
export function secureShuffle<T>(array: readonly T[]): T[] {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandomIndex(i + 1);
    const a = result[i]!;
    result[i] = result[j]!;
    result[j] = a;
  }
  return result;
}

/**
 * Cryptographically secure random boolean with probability `p` of `true`.
 * Defaults to a fair coin (p = 0.5).
 */
export function secureRandomBool(p: number = 0.5): boolean {
  if (!(p >= 0 && p <= 1)) throw new Error('Probability must be in [0, 1]');
  // Draw 32 bits and compare against p to keep bias negligible (~2^-32).
  const bytes = Crypto.getRandomValues(new Uint8Array(4));
  const bits = ((bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!) >>> 0;
  return bits / 0x100000000 < p;
}

