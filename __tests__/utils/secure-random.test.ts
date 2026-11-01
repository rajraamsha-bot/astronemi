/**
 * Tests for the cryptographically secure random utility.
 *
 * These tests verify:
 * 1. Output length is correct
 * 2. Output characters all come from the supplied charset
 * 3. Output is non-deterministic (different each call)
 * 4. Helpers (secureRandomId, prefixedSecureId, generateSecureReferralCode)
 *    produce values with the expected format
 */

import * as Crypto from 'expo-crypto';
import {
  secureRandomString,
  secureRandomId,
  prefixedSecureId,
  generateSecureReferralCode,
  secureRandomIndex,
  secureShuffle,
  secureRandomBool,
} from '@/utils/secure-random';

describe('secureRandomString', () => {
  it('produces a string of the requested length', () => {
    expect(secureRandomString(8)).toHaveLength(8);
    expect(secureRandomString(32)).toHaveLength(32);
    expect(secureRandomString(1)).toHaveLength(1);
  });

  it('uses only characters from the supplied charset', () => {
    const charset = 'ABC123';
    const value = secureRandomString(200, charset);
    for (const ch of value) {
      expect(charset).toContain(ch);
    }
  });

  it('uses the default alphanumeric charset by default', () => {
    const value = secureRandomString(100);
    expect(value).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('produces different output across calls', () => {
    const samples = new Set<string>();
    for (let i = 0; i < 50; i++) {
      samples.add(secureRandomString(16));
    }
    // With 16 chars from a 62-char alphabet, collisions in 50 samples
    // are astronomically unlikely (~3e-86).
    expect(samples.size).toBe(50);
  });

  it('throws on invalid input', () => {
    expect(() => secureRandomString(0)).toThrow();
    expect(() => secureRandomString(-5)).toThrow();
    expect(() => secureRandomString(10, '')).toThrow();
  });

  it('throws when the charset exceeds 256 characters', () => {
    const huge = 'a'.repeat(257);
    expect(() => secureRandomString(8, huge)).toThrow('256');
    // Boundary: exactly 256 is allowed.
    expect(secureRandomString(8, 'a'.repeat(256))).toHaveLength(8);
  });
});

describe('secureRandomIndex', () => {
  it('returns an index within [0, length)', () => {
    for (const len of [1, 2, 7, 31, 256]) {
      for (let i = 0; i < 50; i++) {
        const idx = secureRandomIndex(len);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(len);
        expect(Number.isInteger(idx)).toBe(true);
      }
    }
  });

  it('always returns 0 for length 1', () => {
    expect(secureRandomIndex(1)).toBe(0);
  });

  it('throws on invalid length', () => {
    expect(() => secureRandomIndex(0)).toThrow();
    expect(() => secureRandomIndex(-3)).toThrow();
    expect(() => secureRandomIndex(2.5)).toThrow();
    expect(() => secureRandomIndex(257)).toThrow('256');
  });
});

describe('secureShuffle', () => {
  it('returns a permutation of the same elements', () => {
    const input = [1, 2, 3, 4, 5];
    const shuffled = secureShuffle(input);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(input);
  });

  it('does not mutate the input array', () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    secureShuffle(input);
    expect(input).toEqual(copy);
  });

  it('handles empty and single-element arrays', () => {
    expect(secureShuffle([])).toEqual([]);
    expect(secureShuffle([42])).toEqual([42]);
  });

  it('eventually produces a different order for a large array', () => {
    const input = Array.from({ length: 10 }, (_, i) => i);
    const orders = new Set<string>();
    for (let i = 0; i < 20; i++) {
      orders.add(secureShuffle(input).join(','));
    }
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe('secureRandomBool', () => {
  it('returns true or false for a fair coin', () => {
    for (let i = 0; i < 50; i++) {
      const v = secureRandomBool();
      expect(typeof v).toBe('boolean');
    }
  });

  it('respects extreme probabilities', () => {
    // p=0 never true, p=1 always true.
    expect(secureRandomBool(0)).toBe(false);
    expect(secureRandomBool(1)).toBe(true);
  });

  it('throws on out-of-range probability', () => {
    expect(() => secureRandomBool(-0.1)).toThrow();
    expect(() => secureRandomBool(1.1)).toThrow();
    expect(() => secureRandomBool(NaN)).toThrow();
  });
});

describe('secureRandomId', () => {
  it('produces a URL-safe base64 string', () => {
    const id = secureRandomId();
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('is deterministic length per byte count', () => {
    // 16 bytes -> 22 base64url chars (no padding)
    expect(secureRandomId(16)).toHaveLength(22);
    // 8 bytes -> 11 base64url chars
    expect(secureRandomId(8)).toHaveLength(11);
  });

  it('produces unique values', () => {
    const samples = new Set<string>();
    for (let i = 0; i < 100; i++) {
      samples.add(secureRandomId());
    }
    expect(samples.size).toBe(100);
  });
});

describe('prefixedSecureId', () => {
  it('prefixes the id with the supplied string', () => {
    const id = prefixedSecureId('device');
    expect(id).toMatch(/^device_/);
    // Strip the prefix and confirm the remainder is a valid secure id
    const remainder = id.slice('device_'.length);
    expect(remainder).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('generateSecureReferralCode', () => {
  it('is 8 characters long', () => {
    expect(generateSecureReferralCode()).toHaveLength(8);
  });

  it('avoids visually ambiguous characters (0, O, 1, I, L)', () => {
    const ambiguous = /[0O1IL]/;
    for (let i = 0; i < 20; i++) {
      expect(generateSecureReferralCode()).not.toMatch(ambiguous);
    }
  });

  it('uses uppercase letters and digits only', () => {
    const code = generateSecureReferralCode();
    expect(code).toMatch(/^[A-Z2-9]+$/);
  });

  it('produces unique codes across many calls', () => {
    const samples = new Set<string>();
    for (let i = 0; i < 100; i++) {
      samples.add(generateSecureReferralCode());
    }
    expect(samples.size).toBe(100);
  });
});

describe('integration with expo-crypto', () => {
  it('uses Crypto.getRandomValues as the entropy source', () => {
    const spy = jest.spyOn(Crypto, 'getRandomValues');
    secureRandomString(16);
    secureRandomIndex(10);
    secureRandomBool();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
