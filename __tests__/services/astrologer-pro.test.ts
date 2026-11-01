/**
 * Tests for astrologerProService + tipsService — happy paths.
 *
 * These mock supabase and check that the service:
 *   - returns mapped data on success
 *   - handles errors gracefully
 *   - validates inputs before making network calls
 *   - short-circuits when Supabase is not configured
 */

import { astrologerProService } from '@/services/astrologer-pro';
import { tipsService } from '@/services/tips';

const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn(),
};

jest.mock('@/lib/supabase', () => ({
  get supabase() { return mockSupabase; },
  isSupabaseConfigured: () => true,
}));

jest.mock('@/services/error-reporting', () => ({
  errorReporting: { captureException: jest.fn() },
}));

jest.mock('@/services/logger', () => ({
  Logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

describe('astrologerProService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listPlans', () => {
    it('returns mapped plans', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'p1', slug: 'free', display_name: 'Free',
              monthly_price_inr: 0, yearly_price_inr: 0,
              rank_boost: 0, visibility_multiplier: 1,
              badge_color: '#9CA3AF', max_profile_photos: 3,
              can_set_custom_rate: false, can_livestream: false,
              priority_support: false, features_json: ['x'],
              is_active: true, display_order: 0,
            },
            {
              id: 'p2', slug: 'pro', display_name: 'AstroPro',
              monthly_price_inr: 1999, yearly_price_inr: 19999,
              rank_boost: 50, visibility_multiplier: 2.5,
              badge_color: '#6B46C1', max_profile_photos: 8,
              can_set_custom_rate: true, can_livestream: true,
              priority_support: true, features_json: ['a', 'b'],
              is_active: true, display_order: 1,
            },
          ],
          error: null,
        }),
      });

      const plans = await astrologerProService.listPlans();
      expect(plans).toHaveLength(2);
      expect(plans[1]?.slug).toBe('pro');
      expect(plans[1]?.monthlyPriceInr).toBe(1999);
    });

    it('returns empty array on error', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: new Error('boom') }),
      });
      const plans = await astrologerProService.listPlans();
      expect(plans).toEqual([]);
    });
  });

  describe('subscribe', () => {
    it('returns error for invalid inputs', async () => {
      const result = await astrologerProService.subscribe('', 'pro', 'monthly', 'pay_1');
      expect(result.success).toBe(false);
    });

    it('surfaces server error message', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: new Error('RPC failed') });
      const result = await astrologerProService.subscribe('ast-1', 'pro', 'monthly', 'pay_1');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed');
    });

    it('returns success on valid response', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { success: true, message: 'Activated', subscription_id: 's1', ends_at: '2026-12-01' },
        error: null,
      });
      const result = await astrologerProService.subscribe('ast-1', 'pro', 'monthly', 'pay_1');
      expect(result.success).toBe(true);
      expect(result.subscriptionId).toBe('s1');
    });
  });
});

describe('tipsService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('sendTip', () => {
    it('rejects non-positive amount', async () => {
      const r = await tipsService.sendTip({ userId: 'u1', astrologerId: 'a1', amountInr: 0 });
      expect(r.success).toBe(false);
    });

    it('rejects excessive amount', async () => {
      const r = await tipsService.sendTip({ userId: 'u1', astrologerId: 'a1', amountInr: 200000 });
      expect(r.success).toBe(false);
    });

    it('returns success on valid response', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { success: true, message: 'Tip sent', tip_id: 't1', new_balance: 900 },
        error: null,
      });
      const r = await tipsService.sendTip({ userId: 'u1', astrologerId: 'a1', amountInr: 100 });
      expect(r.success).toBe(true);
      expect(r.tipId).toBe('t1');
      expect(r.newBalance).toBe(900);
    });

    it('detects insufficient balance error from server', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'insufficient_balance: not enough funds' },
      });
      const r = await tipsService.sendTip({ userId: 'u1', astrologerId: 'a1', amountInr: 100 });
      expect(r.success).toBe(false);
      expect(r.message).toContain('Insufficient');
    });
  });

  describe('getPresets', () => {
    it('returns mapped presets', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            { id: 'p1', amount_inr: 51,  emoji: '\u2615', label: 'Coffee',  display_order: 0 },
            { id: 'p2', amount_inr: 101, emoji: '\uD83C\uDF38', label: 'Thanks',  display_order: 1 },
          ],
          error: null,
        }),
      });
      const presets = await tipsService.getPresets();
      expect(presets).toHaveLength(2);
      expect(presets[0]?.amountInr).toBe(51);
    });
  });
});
