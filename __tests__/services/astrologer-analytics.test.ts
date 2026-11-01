/**
 * Astrologer Analytics Service Tests
 */

import AstrologerAnalyticsService from '@/services/astrologer-analytics';
import { supabase } from '@/lib/supabase';
import { MockFromResponse, createMockThenable } from '../utils/mockSupabase';

describe('Astrologer Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // astrologer_earnings_summary RPC (migration 039). Individual tests
    // override with mockResolvedValueOnce for specific lifetime/pending nets.
    (supabase as any).rpc = jest.fn().mockResolvedValue({
      data: { lifetime_net: 0, pending_net: 0 },
      error: null,
    });
  });

  function mockFrom(response: MockFromResponse) {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      const res = typeof response === 'function' ? response(table) : response;
      return createMockThenable(res);
    });
  }

  describe('getEarningsSummary', () => {
    it('should calculate earnings correctly', async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      mockFrom({
        data: [
          { total_amount: 100, start_time: today },
          { total_amount: 200, start_time: today },
          { total_amount: 150, start_time: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString() },
        ],
        error: null,
      });
      // Lifetime/pending now come from the earnings ledger RPC, not row scans.
      ((supabase as any).rpc as jest.Mock).mockResolvedValueOnce({
        data: { lifetime_net: 315, pending_net: 175 },
        error: null,
      });

      const earnings = await AstrologerAnalyticsService.getEarningsSummary('astro-1');

      expect(earnings.today).toBeGreaterThan(0);
      expect(earnings.total).toBe(315); // (100+200+150) * 0.7 = 315
      expect(earnings.pendingPayout).toBe(175); // (100+150) * 0.7 = 175
    });

    it('should return zeros when no consultations', async () => {
      mockFrom({ data: [], error: null });

      const earnings = await AstrologerAnalyticsService.getEarningsSummary('astro-1');

      expect(earnings).toEqual({ today: 0, thisWeek: 0, thisMonth: 0, total: 0, pendingPayout: 0 });
    });
  });

  describe('getTodayActivity', () => {
    it('should return hourly activity', async () => {
      const now = new Date();
      const hour10 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0).toISOString();

      mockFrom({
        data: [
          { start_time: hour10, duration_minutes: 600, total_amount: 100 },
          { start_time: hour10, duration_minutes: 300, total_amount: 50 },
        ],
        error: null,
      });

      const activity = await AstrologerAnalyticsService.getTodayActivity('astro-1');

      expect(activity).toHaveLength(24);
      expect(activity[10].consultations).toBe(2);
      expect(activity[10].earnings).toBe(105); // (100+50) * 0.7
    });

    it('should return zeros for empty hours', async () => {
      mockFrom({ data: [], error: null });

      const activity = await AstrologerAnalyticsService.getTodayActivity('astro-1');

      expect(activity[0]).toEqual({ hour: 0, consultations: 0, earnings: 0, avgDuration: 0 });
    });
  });

  describe('getLast7Days', () => {
    it('should return 7 days of activity', async () => {
      mockFrom({ data: [], error: null });

      const days = await AstrologerAnalyticsService.getLast7Days('astro-1');

      expect(days).toHaveLength(7);
    });
  });

  describe('getRatingDistribution', () => {
    it('should calculate rating distribution', async () => {
      mockFrom({
        data: [
          { rating: 5 }, { rating: 5 }, { rating: 4 },
          { rating: 3 }, { rating: 5 }, { rating: 2 },
        ],
        error: null,
      });

      const distribution = await AstrologerAnalyticsService.getRatingDistribution('astro-1');

      expect(distribution).toHaveLength(5);
      expect(distribution.find((d) => d.rating === 5)?.count).toBe(3);
      expect(distribution.find((d) => d.rating === 4)?.count).toBe(1);
      expect(distribution.find((d) => d.rating === 1)?.count).toBe(0);
    });
  });

  describe('getTypeBreakdown', () => {
    it('should breakdown by consultation type', async () => {
      mockFrom({
        data: [
          { type: 'chat', total_amount: 100, duration_minutes: 600 },
          { type: 'chat', total_amount: 50, duration_minutes: 300 },
          { type: 'video', total_amount: 200, duration_minutes: 1800 },
        ],
        error: null,
      });

      const breakdown = await AstrologerAnalyticsService.getTypeBreakdown('astro-1');

      expect(breakdown).toHaveLength(3);
      const chat = breakdown.find((b) => b.type === 'chat');
      expect(chat?.count).toBe(2);
      expect(chat?.earnings).toBe(105); // (100+50) * 0.7
    });
  });

  describe('getPeakHours', () => {
    it('should identify peak and quiet hours', async () => {
      mockFrom({
        data: Array.from({ length: 50 }, (_, i) => ({
          start_time: new Date(Date.now() - i * 2 * 60 * 60 * 1000).toISOString(),
        })),
        error: null,
      });

      const peak = await AstrologerAnalyticsService.getPeakHours('astro-1');

      expect(peak.peakHours.length).toBeGreaterThan(0);
      expect(peak.quietHours.length).toBeGreaterThan(0);
      expect(peak.recommendedHours.length).toBeGreaterThan(0);
    });

    it('should return empty arrays on error', async () => {
      mockFrom({ data: null, error: new Error('DB error') });

      const peak = await AstrologerAnalyticsService.getPeakHours('astro-1');

      expect(peak.peakHours).toEqual([]);
    });
  });

  describe('getTotals', () => {
    it('should calculate total metrics', async () => {
      mockFrom({
        data: [
          { duration_minutes: 600, user_id: 'user-1' },
          { duration_minutes: 300, user_id: 'user-2' },
          { duration_minutes: 900, user_id: 'user-1' },
        ],
        error: null,
      });

      const totals = await AstrologerAnalyticsService.getTotals('astro-1');

      expect(totals.totalConsultations).toBe(3);
      expect(totals.avgSessionDuration).toBe(10); // (600+300+900)/3/60 = 10
      expect(totals.repeatCustomerRate).toBeGreaterThan(0); // user-1 has 2 consultations
      expect(totals.responseRate).toBe(0.95); // placeholder
    });

    it('should return zeros when no consultations', async () => {
      mockFrom({ data: [], error: null });

      const totals = await AstrologerAnalyticsService.getTotals('astro-1');

      expect(totals).toEqual({
        totalConsultations: 0,
        avgSessionDuration: 0,
        repeatCustomerRate: 0,
        responseRate: 0,
      });
    });
  });

  describe('getDashboard', () => {
    it('should return complete dashboard data', async () => {
      mockFrom({ data: [], error: null });

      const dashboard = await AstrologerAnalyticsService.getDashboard('astro-1');

      expect(dashboard).not.toBeNull();
      expect(dashboard?.earnings).toBeDefined();
      expect(dashboard?.todayActivity).toHaveLength(24);
      expect(dashboard?.last7Days).toHaveLength(7);
      expect(dashboard?.ratingDistribution).toBeDefined();
      expect(dashboard?.typeBreakdown).toBeDefined();
      expect(dashboard?.peakHours).toBeDefined();
      expect(typeof dashboard?.totalConsultations).toBe('number');
    });

    it('should return dashboard with defaults when sub-queries error', async () => {
      mockFrom({ data: null, error: new Error('DB error') });

      const dashboard = await AstrologerAnalyticsService.getDashboard('astro-1');

      // Sub-methods swallow errors and return defaults, so dashboard still renders
      expect(dashboard).not.toBeNull();
      expect(dashboard?.earnings.total).toBe(0);
      expect(dashboard?.totalConsultations).toBe(0);
      expect(dashboard?.todayActivity).toHaveLength(24);
    });
  });
});
