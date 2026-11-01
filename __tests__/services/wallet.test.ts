/**
 * Wallet Service Tests
 *
 * Tests balance operations, caching, Supabase RPC integration,
 * and transaction recording.
 */

import {
  getWalletBalance,
  getTransactionHistory,
  topupWallet,
  deductFromWallet,
  creditWallet,
  hasSufficientBalance,
  getMonthlySpending,
  TOPUP_OPTIONS,
} from '@/services/wallet';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { secureStorage } from '@/services/secure-storage';

let mockSecureStorageStore: Record<string, string> = {};

jest.mock('@/services/secure-storage', () => ({
  secureStorage: {
    getItem: jest.fn((key: string) => Promise.resolve(mockSecureStorageStore[key] || null)),
    setItem: jest.fn((key: string, value: string) => {
      mockSecureStorageStore[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete mockSecureStorageStore[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      mockSecureStorageStore = {};
      return Promise.resolve();
    }),
  },
}));
jest.mock('@/services/rate-limiter', () => ({
  RateLimiter: {
    checkRateLimit: jest.fn().mockResolvedValue({ isLimited: false }),
    recordAttempt: jest.fn().mockResolvedValue({ blocked: false }),
  },
}));

describe('WalletService', () => {
  const USER_ID = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureStorageStore = {};
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
    // creditWallet() guards against crediting another user's wallet by
    // resolving the authenticated user server-side (auth.getUser).
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
  });

  describe('spending aggregates', () => {
    const chainAmounts = (rows: unknown[]) => {
      const gte = jest.fn(() => Promise.resolve({ data: rows, error: null }));
      const eqType = jest.fn(() => ({ gte }));
      const eqUser = jest.fn(() => ({ eq: eqType }));
      const select = jest.fn(() => ({ eq: eqUser }));
      (supabase.from as jest.Mock).mockImplementation((table: string) =>
        table === 'wallet_transactions' ? { select } : {}
      );
      return { gte };
    };

    it('getMonthlySpending sums this month\u2019s debits via a server-side date filter', async () => {
      const { gte } = chainAmounts([{ amount: 120 }, { amount: 30.5 }]);
      const total = await getMonthlySpending(USER_ID);
      expect(total).toBe(150.5);
      expect(gte).toHaveBeenCalledWith('created_at', expect.stringMatching(/T/));
    });

    it('getMonthlySpending falls back to zero when Supabase errors', async () => {
      const gte = jest.fn(() => Promise.resolve({ data: null, error: new Error('down') }));
      const eqType = jest.fn(() => ({ gte }));
      const eqUser = jest.fn(() => ({ eq: eqType }));
      const select = jest.fn(() => ({ eq: eqUser }));
      (supabase.from as jest.Mock).mockReturnValue({ select });
      (secureStorage.getItem as jest.Mock).mockResolvedValue(null);
      await expect(getMonthlySpending(USER_ID)).resolves.toBe(0);
    });

    it('getSpendingBreakdown groups debits by source over a bounded window', async () => {
      const { getSpendingBreakdown } = require('@/services/wallet');
      const gte = jest.fn(() =>
        Promise.resolve({
          data: [
            { source: 'consultation', amount: 200 },
            { source: 'tips', amount: 50 },
            { source: 'consultation', amount: 25 },
          ],
          error: null,
        })
      );
      const eqType = jest.fn(() => ({ gte }));
      const eqUser = jest.fn(() => ({ eq: eqType }));
      const select = jest.fn(() => ({ eq: eqUser }));
      (supabase.from as jest.Mock).mockReturnValue({ select });

      const breakdown = await getSpendingBreakdown(USER_ID);
      expect(breakdown).toEqual({ consultation: 225, tips: 50 });
    });
  });

  describe('TOPUP_OPTIONS', () => {
    it('should have 6 predefined options with no phantom bonus fields', () => {
      expect(TOPUP_OPTIONS).toHaveLength(6);
      // The server credits exactly the paid amount — bonus fields used to
      // advertise credit the backend never applied.
      expect(TOPUP_OPTIONS[0]).toEqual({ amount: 100 });
      expect(TOPUP_OPTIONS[2]).toEqual({ amount: 500, popular: true });
      expect(TOPUP_OPTIONS.some(o => 'bonus' in o)).toBe(false);
    });
  });

  describe('getWalletBalance', () => {
    it('should return cached balance if within TTL', async () => {
      const cached = JSON.stringify({ balance: 500, timestamp: Date.now() });
      (secureStorage.getItem as jest.Mock).mockResolvedValueOnce(cached);
      const balance = await getWalletBalance(USER_ID);
      expect(balance).toBe(500);
      expect(supabase.from).not.toHaveBeenCalledWith('users');
    });

    it('should fetch from Supabase when cache expired', async () => {
      const oldCache = JSON.stringify({ balance: 100, timestamp: Date.now() - 120000 });
      (secureStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(oldCache) // First call for cache
        .mockResolvedValueOnce(null);    // Second call for dev fallback

      const mockSingle = jest.fn().mockResolvedValue({
        data: { wallet_balance: 250 },
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      const balance = await getWalletBalance(USER_ID);
      expect(balance).toBe(250);
      expect(secureStorage.setItem).toHaveBeenCalled();
    });

    it('should return 0 when no cache and Supabase fails', async () => {
      (secureStorage.getItem as jest.Mock).mockResolvedValue(null);
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: new Error('DB down') });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      const balance = await getWalletBalance(USER_ID);
      expect(balance).toBe(0);
    });
  });

  describe('getTransactionHistory', () => {
    const dbRow = (id: string) => ({
      id,
      user_id: USER_ID,
      type: 'debit',
      amount: 100,
      balance_after: 400,
      source: 'consultation',
      description: 'Consultation',
      created_at: new Date().toISOString(),
    });

    const mockRange = (data: unknown) => {
      const range = jest.fn().mockResolvedValue({ data, error: null });
      const order = jest.fn().mockReturnValue({ range });
      const eq = jest.fn().mockReturnValue({ order });
      const select = jest.fn().mockReturnValue({ eq });
      (supabase.from as jest.Mock).mockReturnValue({ select });
      return range;
    };

    it('should request the requested page range', async () => {
      const range = mockRange([dbRow('tx-1')]);
      const result = await getTransactionHistory(USER_ID, 10, 20);
      expect(range).toHaveBeenCalledWith(20, 29);
      expect(result).toHaveLength(1);
    });

    it('should cache the first page only', async () => {
      mockRange([dbRow('tx-1')]);
      await getTransactionHistory(USER_ID, 10, 0);
      expect(secureStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('transactions'),
        expect.any(String)
      );
    });

    it('should not overwrite the cache with a deeper page', async () => {
      // Caching an offset page and then slicing it again by offset in the
      // offline fallback silently skipped 2x the intended rows.
      mockRange([dbRow('tx-21')]);
      await getTransactionHistory(USER_ID, 10, 20);
      expect(secureStorage.setItem).not.toHaveBeenCalledWith(
        expect.stringContaining('transactions'),
        expect.any(String)
      );
    });

    it('should fall back to cache when Supabase is not configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      const cached = JSON.stringify([dbRow('tx-1'), dbRow('tx-2'), dbRow('tx-3')]);
      (secureStorage.getItem as jest.Mock).mockResolvedValueOnce(cached);

      const result = await getTransactionHistory(USER_ID, 2, 1);
      expect(result).toHaveLength(2);
    });

    it('should return an empty list when there is no cache', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      (secureStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      const result = await getTransactionHistory(USER_ID);
      expect(result).toEqual([]);
    });
  });

  describe('hasSufficientBalance', () => {
    it('should return true when balance >= amount', async () => {
      const cached = JSON.stringify({ balance: 500, timestamp: Date.now() });
      (secureStorage.getItem as jest.Mock).mockResolvedValueOnce(cached);
      const result = await hasSufficientBalance(USER_ID, 300);
      expect(result).toBe(true);
    });

    it('should return false when balance < amount', async () => {
      const cached = JSON.stringify({ balance: 100, timestamp: Date.now() });
      (secureStorage.getItem as jest.Mock).mockResolvedValueOnce(cached);
      const result = await hasSufficientBalance(USER_ID, 200);
      expect(result).toBe(false);
    });
  });

  describe('deductFromWallet', () => {
    it('should reject when balance is insufficient', async () => {
      const cached = JSON.stringify({ balance: 50, timestamp: Date.now() });
      (secureStorage.getItem as jest.Mock).mockResolvedValueOnce(cached);
      (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
        data: { success: false, message: 'Insufficient wallet balance' },
        error: null,
      });
      const result = await deductFromWallet(USER_ID, 100, 'consultation-1');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Insufficient');
    });

    it('should deduct via Edge Function when configured', async () => {
      const cached = JSON.stringify({ balance: 500, timestamp: Date.now() });
      (secureStorage.getItem as jest.Mock).mockResolvedValueOnce(cached);
      (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({ data: { success: true, newBalance: 400 }, error: null });

      const result = await deductFromWallet(USER_ID, 100, 'consultation-1');
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(400);
      expect(supabase.functions.invoke).toHaveBeenCalledWith('deduct-wallet', expect.objectContaining({
        body: expect.objectContaining({
          amount: 100,
          source: 'consultation',
        }),
      }));
    });

    it('should reject when Supabase is not configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      const cached = JSON.stringify({ balance: 500, timestamp: Date.now() });
      (secureStorage.getItem as jest.Mock).mockResolvedValueOnce(cached);

      const result = await deductFromWallet(USER_ID, 100, 'consultation-1');
      expect(result.success).toBe(false);
    });
  });

  describe('creditWallet', () => {
    it('should refuse to credit client-side (server-authoritative only)', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: 600, error: null });
      const result = await creditWallet(USER_ID, 100, 'topup', 'Test credit');
      expect(result.success).toBe(false);
      expect(result.message).toContain('server-side');
      // The client must never call the credit_wallet RPC (revoked + guarded).
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should return error when Supabase is not configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      const result = await creditWallet(USER_ID, 100, 'referral', 'Referral bonus');
      expect(result.success).toBe(false);
      expect(result.message).toContain('unavailable');
    });
  });

  describe('topupWallet', () => {
    it('should reject amounts below minimum', async () => {
      const result = await topupWallet(USER_ID, 5);
      expect(result.success).toBe(false);
      expect(result.message).toContain('between');
    });

    it('should reject amounts above maximum', async () => {
      const result = await topupWallet(USER_ID, 100000);
      expect(result.success).toBe(false);
      expect(result.message).toContain('between');
    });

    it('should not credit directly — money only lands via the verified payment webhook', async () => {
      // SECURITY: topupWallet() validates input and records intent only. It
      // deliberately refuses to credit the wallet client-side; credit is
      // applied server-side by the razorpay-webhook after signature
      // verification (see PaymentService.startWalletTopup).
      const cached = JSON.stringify({ balance: 100, timestamp: Date.now() });
      (secureStorage.getItem as jest.Mock).mockResolvedValueOnce(cached);
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: 600, error: null });

      const result = await topupWallet(USER_ID, 500);
      expect(result.success).toBe(false);
      expect(result.message.toLowerCase()).toContain('crediting');
      // No balance was mutated on the server or in the local cache.
      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(secureStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('getMonthlySpending', () => {
    it('should calculate spending from current month only', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      (secureStorage.getItem as jest.Mock).mockReset();
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 5);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 5);

      const transactions = [
        { id: '1', userId: USER_ID, type: 'debit', amount: 100, balanceAfter: 400, source: 'consultation', description: 'Test', createdAt: thisMonth },
        { id: '2', userId: USER_ID, type: 'debit', amount: 50, balanceAfter: 350, source: 'consultation', description: 'Test', createdAt: thisMonth },
        { id: '3', userId: USER_ID, type: 'debit', amount: 200, balanceAfter: 150, source: 'consultation', description: 'Test', createdAt: lastMonth },
        { id: '4', userId: USER_ID, type: 'credit', amount: 500, balanceAfter: 650, source: 'topup', description: 'Test', createdAt: thisMonth },
      ];

      (secureStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key.includes('transactions')) return JSON.stringify(transactions);
        return null;
      });
      const spending = await getMonthlySpending(USER_ID);
      expect(spending).toBe(150); // 100 + 50, not 200 (last month) or credit
    });
  });
});
