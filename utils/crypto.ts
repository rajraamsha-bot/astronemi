/**
 * Cryptographic Utilities
 *
 * Provides secure random generation functions for OTPs, UUIDs, and referral codes.
 *
 * Uses expo-crypto on React Native / Expo (the original implementation relied on
 * the browser-only global `crypto`, which does NOT exist on device, so every
 * function threw at runtime). Falls back to the global Web Crypto API in
 * browsers and the Jest test environment so behaviour stays consistent.
 */

import * as ExpoCrypto from 'expo-crypto';

/** Return the global Web Crypto object if present (browser / Jest), else null. */
function webCrypto(): Crypto | null {
  const g = globalThis as any;
  return typeof g !== 'undefined' && g.crypto ? (g.crypto as Crypto) : null;
}

/**
 * Draw a cryptographically secure unsigned 32-bit integer using rejection
 * sampling when a bounded value is requested (via getSecureRandomInt) and a
 * plain 32-bit draw otherwise.
 */
function getUint32(): number {
  const web = webCrypto();
  if (web && typeof web.getRandomValues === 'function') {
    return web.getRandomValues(new Uint32Array(1))[0]!;
  }
  // expo-crypto only accepts Uint8Array; assemble a 32-bit value from 4 bytes.
  const bytes = new Uint8Array(4);
  ExpoCrypto.getRandomValues(bytes);
  return ((bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!) >>> 0;
}

/**
 * Generate a cryptographically secure integer within [min, max).
 * Uses rejection sampling to avoid modulo bias.
 */
function getSecureRandomInt(min: number, max: number): number {
  const range = max - min;
  if (range <= 0) throw new Error('Invalid range for secure random');
  // Largest multiple of `range` that fits in 2^32; reject larger draws.
  const maxValid = Math.floor(0x100000000 / range) * range;
  for (;;) {
    const v = getUint32();
    if (v < maxValid) return min + (v % range);
  }
}

/**
 * Generate a secure 6-digit OTP.
 * @returns A 6-digit OTP string between 100000 and 999999.
 */
export function generateOTP(): string {
  return getSecureRandomInt(100000, 1000000).toString();
}

/**
 * Generate a UUID v4.
 */
export function generateUUID(): string {
  const web = webCrypto();
  if (web && typeof web.randomUUID === 'function') {
    return web.randomUUID();
  }
  const bytes = new Uint8Array(16);
  const web2 = webCrypto();
  if (web2 && typeof web2.getRandomValues === 'function') {
    web2.getRandomValues(bytes);
  } else {
    ExpoCrypto.getRandomValues(bytes);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC 4122 variant 10xx
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

/**
 * Generate a secure referral code.
 * @param prefix - Prefix for the referral code (default: 'ASTRO')
 * @param length - Length of the random part (default: 6)
 */
export function generateReferralCode(prefix: string = 'ASTRO', length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix;
  for (let i = 0; i < length; i++) {
    code += chars[getSecureRandomInt(0, chars.length)]!;
  }
  return code;
}

/**
 * Generate a SHA-256 hex hash of a string.
 */
export async function hashData(data: string): Promise<string> {
  const web = webCrypto();
  if (web && web.subtle && typeof web.subtle.digest === 'function') {
    const dataBuffer = new TextEncoder().encode(data);
    const hashBuffer = await web.subtle.digest('SHA-256', dataBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return ExpoCrypto.digestStringAsync(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data);
}

/**
 * Check whether cryptographically secure random generation is available.
 * expo-crypto is always available on native; on web we require getRandomValues.
 */
export function isSecureRandomAvailable(): boolean {
  const web = webCrypto();
  return Boolean(web && typeof web.getRandomValues === 'function') || true;
}

export default {
  generateOTP,
  generateUUID,
  generateReferralCode,
  isSecureRandomAvailable,
  hashData,
};
