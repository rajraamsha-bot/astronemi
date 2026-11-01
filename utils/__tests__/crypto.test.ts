import { generateOTP, generateUUID, generateReferralCode, hashData } from '../crypto';

// Mock crypto for consistent testing
const mockSubtle = {
  digest: jest.fn((algorithm, data) => {
    // Mock SHA-256 hash for 'test-string'
    if (algorithm === 'SHA-256' && new TextDecoder().decode(data) === 'test-string') {
      return Promise.resolve(new Uint8Array([
        0xd5, 0x05, 0xc2, 0x4e, 0x6c, 0xa6, 0xf4, 0xf2, 0x60, 0x19, 0x5d, 0x75, 0xcb, 0xef, 0x1f, 0x5c,
        0x69, 0x78, 0x47, 0x9e, 0x0a, 0x29, 0x4b, 0x36, 0x1a, 0x49, 0x47, 0x9b, 0x18, 0x36, 0xa9, 0x9c
      ]));
    }
    // For other data, return a mock hash
    return Promise.resolve(new Uint8Array(Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))));
  }),
};

let randomCounter = 0;
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn((array) => {
      // Fill with incrementing values for testing
      array[0] = 500000 + randomCounter++;
      return array;
    }),
    randomUUID: jest.fn(() => '12345678-1234-4123-8123-123456789012'),
    subtle: mockSubtle,
  },
  writable: true,
});

describe('Crypto Utilities', () => {
  describe('generateOTP', () => {
    it('should generate a 6-digit string', () => {
      const otp = generateOTP();
      expect(otp).toHaveLength(6);
      expect(Number(otp)).toBeGreaterThanOrEqual(100000);
      expect(Number(otp)).toBeLessThanOrEqual(999999);
    });

    it('should generate different values on subsequent calls', () => {
      const otp1 = generateOTP();
      const otp2 = generateOTP();
      expect(otp1).not.toBe(otp2);
    });
  });

  describe('generateUUID', () => {
    it('should generate a valid UUID v4 format', () => {
      const uuid = generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });
  });

  describe('generateReferralCode', () => {
    it('should generate a code with default prefix', () => {
      const code = generateReferralCode();
      expect(code.startsWith('ASTRO')).toBe(true);
      expect(code).toHaveLength(11); // 'ASTRO' (5) + default length (6)
    });

    it('should respect custom prefix and length', () => {
      const code = generateReferralCode('TEST', 4);
      expect(code.startsWith('TEST')).toBe(true);
      expect(code).toHaveLength(8);
    });
  });

  describe('hashData', () => {
    it('should generate a consistent SHA-256 hash', async () => {
      const data = 'test-string';
      const hash1 = await hashData(data);
      const hash2 = await hashData(data);
      
      // SHA-256 of 'test-string'
      const expected = 'd505c24e6ca6f4f260195d75cbef1f5c6978479e0a294b361a49479b1836a99c';
      
      expect(hash1).toBe(expected);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different data', async () => {
      const hash1 = await hashData('data1');
      const hash2 = await hashData('data2');
      expect(hash1).not.toBe(hash2);
    });
  });
});
