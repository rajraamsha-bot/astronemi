/**
 * Astrologer Analytics Service
 *
 * Provides earnings, ratings, peak hours, and performance metrics
 * for astrologers to track their business on the platform.
 */

import { supabase } from '@/lib/supabase';
import { Logger } from './logger';

export interface EarningsSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  total: number;
  pendingPayout: number;
}

export interface HourlyActivity {
  hour: number; // 0-23
  consultations: number;
  earnings: number;
  avgDuration: number;
}

export interface DailyActivity {
  date: string;
  consultations: number;
  earnings: number;
  avgRating: number;
}

export interface RatingDistribution {
  rating: number; // 1-5
  count: number;
}

export interface ConsultationTypeBreakdown {
  type: 'chat' | 'call' | 'video';
  count: number;
  earnings: number;
  avgDuration: number;
}

export interface PeakHoursAnalysis {
  peakHours: number[]; // Hours with highest activity
  quietHours: number[]; // Hours with lowest activity
  recommendedHours: number[]; // Hours to be online
}

export interface AstrologerDashboard {
  earnings: EarningsSummary;
  todayActivity: HourlyActivity[];
  last7Days: DailyActivity[];
  ratingDistribution: RatingDistribution[];
  typeBreakdown: ConsultationTypeBreakdown[];
  peakHours: PeakHoursAnalysis;
  totalConsultations: number;
  avgSessionDuration: number; // minutes
  repeatCustomerRate: number; // 0-1
  responseRate: number; // 0-1
}

export const AstrologerAnalyticsService = {
  /**
   * Get complete analytics dashboard for an astrologer.
   */
  async getDashboard(astrologerId: string): Promise<AstrologerDashboard | null> {
    try {
      const [
        earnings,
        todayActivity,
        last7Days,
        ratingDistribution,
        typeBreakdown,
        peakHours,
        totals,
      ] = await Promise.all([
        this.getEarningsSummary(astrologerId),
        this.getTodayActivity(astrologerId),
        this.getLast7Days(astrologerId),
        this.getRatingDistribution(astrologerId),
        this.getTypeBreakdown(astrologerId),
        this.getPeakHours(astrologerId),
        this.getTotals(astrologerId),
      ]);

      return {
        earnings,
        todayActivity,
        last7Days,
        ratingDistribution,
        typeBreakdown,
        peakHours,
        ...totals,
      };
    } catch (err) {
      Logger.error('Failed to get astrologer dashboard', err);
      return null;
    }
  },

  /**
   * Get earnings summary (today, week, month, total).
   */
  async getEarningsSummary(astrologerId: string): Promise<EarningsSummary> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      // Bound the row fetch to the trailing 12 months: today/week/month are
      // always inside it, and lifetime totals come from the server-side
      // astrologer_earnings_summary() RPC instead of shipping every
      // historical consultation to the client.
      const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

      const [{ data, error }, { data: sums, error: rpcError }] = await Promise.all([
        supabase
          .from('consultations')
          .select('total_amount, start_time')
          .eq('astrologer_id', astrologerId)
          .eq('status', 'completed')
          .gte('start_time', twelveMonthsAgo),
        supabase.rpc('astrologer_earnings_summary', { p_astrologer_id: astrologerId }),
      ]);

      if (error) throw error;

      const consultations = (data ?? []) as Array<{ total_amount?: number; start_time: string }>;
      const summary = (Array.isArray(sums) ? sums[0] : sums) as
        | { lifetime_net?: number; pending_net?: number }
        | undefined;
      if (rpcError) Logger.warn('astrologer_earnings_summary RPC failed', { error: rpcError });

      let today = 0;
      let thisWeek = 0;
      let thisMonth = 0;

      for (const c of consultations) {
        const amount = c.total_amount ?? 0;
        const startTime = new Date(c.start_time);
        if (startTime >= new Date(todayStart)) today += amount;
        if (startTime >= new Date(weekStart)) thisWeek += amount;
        if (startTime >= new Date(monthStart)) thisMonth += amount;
      }

      // Windowed figures are gross consultation amounts; the platform fee is
      // a fixed 30% (complete_consultation), so the astrologer share is 70%.
      // Lifetime/pending come straight from the authoritative earnings ledger.
      return {
        today: Math.round(today * 0.7),
        thisWeek: Math.round(thisWeek * 0.7),
        thisMonth: Math.round(thisMonth * 0.7),
        total: Math.round(Number(summary?.lifetime_net ?? 0)),
        pendingPayout: Math.round(Number(summary?.pending_net ?? 0)),
      };
    } catch (err) {
      Logger.error('Failed to get earnings summary', err);
      return { today: 0, thisWeek: 0, thisMonth: 0, total: 0, pendingPayout: 0 };
    }
  },

  /**
   * Get today's hourly activity.
   */
  async getTodayActivity(astrologerId: string): Promise<HourlyActivity[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('consultations')
        .select('start_time, duration_minutes, total_amount')
        .eq('astrologer_id', astrologerId)
        .eq('status', 'completed')
        .gte('start_time', today.toISOString());

      if (error) throw error;

      const hourlyMap = new Map<number, { count: number; earnings: number; durations: number[] }>();

      for (const c of data ?? []) {
        const hour = new Date(c.start_time).getHours();
        const existing = hourlyMap.get(hour) ?? { count: 0, earnings: 0, durations: [] };
        existing.count++;
        existing.earnings += c.total_amount ?? 0;
        existing.durations.push(c.duration_minutes ?? 0);
        hourlyMap.set(hour, existing);
      }

      return Array.from({ length: 24 }, (_, hour) => {
        const stats = hourlyMap.get(hour);
        return {
          hour,
          consultations: stats?.count ?? 0,
          earnings: Math.round((stats?.earnings ?? 0) * 0.7),
          avgDuration: stats
            ? Math.round(stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length / 60)
            : 0,
        };
      });
    } catch (err) {
      Logger.error('Failed to get today activity', err);
      return Array.from({ length: 24 }, (_, hour) => ({ hour, consultations: 0, earnings: 0, avgDuration: 0 }));
    }
  },

  /**
   * Get last 7 days activity.
   */
  async getLast7Days(astrologerId: string): Promise<DailyActivity[]> {
    try {
      const days: DailyActivity[] = [];
      const now = new Date();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

        const { data, error } = await supabase
          .from('consultations')
          .select('total_amount, duration_minutes')
          .eq('astrologer_id', astrologerId)
          .eq('status', 'completed')
          .gte('start_time', date.toISOString())
          .lt('start_time', nextDate.toISOString());

        if (error) throw error;

        const consultations = data ?? [];
        days.push({
          date: date.toISOString().split('T')[0] ?? date.toISOString(),
          consultations: consultations.length,
          earnings: Math.round(consultations.reduce((sum, c) => sum + (c.total_amount ?? 0), 0) * 0.7),
          avgRating: 0, // Would need to join with reviews
        });
      }

      return days;
    } catch (err) {
      Logger.error('Failed to get last 7 days', err);
      return [];
    }
  },

  /**
   * Get rating distribution (1-5 stars).
   */
  async getRatingDistribution(astrologerId: string): Promise<RatingDistribution[]> {
    try {
      // Trailing 12-month window keeps this aggregate bounded; a lifetime
      // rating histogram needs a server-side rollup if product wants it.
      const { data, error } = await supabase
        .from('consultation_reviews')
        .select('rating')
        .eq('astrologer_id', astrologerId)
        .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const counts = new Map<number, number>();
      for (let i = 1; i <= 5; i++) counts.set(i, 0);

      for (const r of data ?? []) {
        counts.set(r.rating, (counts.get(r.rating) ?? 0) + 1);
      }

      return Array.from({ length: 5 }, (_, i) => ({
        rating: i + 1,
        count: counts.get(i + 1) ?? 0,
      }));
    } catch (err) {
      Logger.error('Failed to get rating distribution', err);
      return Array.from({ length: 5 }, (_, i) => ({ rating: i + 1, count: 0 }));
    }
  },

  /**
   * Get consultation type breakdown.
   */
  async getTypeBreakdown(astrologerId: string): Promise<ConsultationTypeBreakdown[]> {
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('type, total_amount, duration_minutes')
        .eq('astrologer_id', astrologerId)
        .eq('status', 'completed')
        .gte('start_time', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const typeMap = new Map<string, { count: number; earnings: number; durations: number[] }>();

      for (const c of data ?? []) {
        const existing = typeMap.get(c.type) ?? { count: 0, earnings: 0, durations: [] };
        existing.count++;
        existing.earnings += c.total_amount ?? 0;
        existing.durations.push(c.duration_minutes ?? 0);
        typeMap.set(c.type, existing);
      }

      const types: ('chat' | 'call' | 'video')[] = ['chat', 'call', 'video'];
      return types.map((type) => {
        const stats = typeMap.get(type);
        return {
          type,
          count: stats?.count ?? 0,
          earnings: Math.round((stats?.earnings ?? 0) * 0.7),
          avgDuration: stats
            ? Math.round(stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length / 60)
            : 0,
        };
      });
    } catch (err) {
      Logger.error('Failed to get type breakdown', err);
      return [];
    }
  },

  /**
   * Analyze peak hours based on historical data.
   */
  async getPeakHours(astrologerId: string): Promise<PeakHoursAnalysis> {
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('start_time')
        .eq('astrologer_id', astrologerId)
        .eq('status', 'completed')
        .gte('start_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const hourlyCounts = new Map<number, number>();
      for (let i = 0; i < 24; i++) hourlyCounts.set(i, 0);

      for (const c of data ?? []) {
        const hour = new Date(c.start_time).getHours();
        hourlyCounts.set(hour, (hourlyCounts.get(hour) ?? 0) + 1);
      }

      const sorted = Array.from(hourlyCounts.entries()).sort((a, b) => b[1] - a[1]);
      const peakHours = sorted.slice(0, 4).map(([h]) => h);
      const quietHours = sorted.slice(-4).map(([h]) => h);

      // Recommended: peak hours + 1 hour buffer on each side
      const recommended = new Set<number>();
      for (const h of peakHours) {
        recommended.add(h);
        recommended.add((h - 1 + 24) % 24);
        recommended.add((h + 1) % 24);
      }

      return {
        peakHours,
        quietHours,
        recommendedHours: Array.from(recommended).sort((a, b) => a - b),
      };
    } catch (err) {
      Logger.error('Failed to get peak hours', err);
      return { peakHours: [], quietHours: [], recommendedHours: [] };
    }
  },

  /**
   * Get total consultations and aggregate metrics.
   */
  async getTotals(astrologerId: string): Promise<{
    totalConsultations: number;
    avgSessionDuration: number;
    repeatCustomerRate: number;
    responseRate: number;
  }> {
    try {
      // Lifetime count via an exact head-count (no rows transferred);
      // avg-duration and repeat-rate are computed over a bounded trailing
      // 12-month window instead of scanning all history.
      const [{ count }, { data, error }] = await Promise.all([
        supabase
          .from('consultations')
          .select('id', { count: 'exact', head: true })
          .eq('astrologer_id', astrologerId)
          .eq('status', 'completed'),
        supabase
          .from('consultations')
          .select('user_id, duration_minutes')
          .eq('astrologer_id', astrologerId)
          .eq('status', 'completed')
          .gte('start_time', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      if (error) throw error;

      const consultations = data ?? [];
      const totalConsultations = count ?? consultations.length;
      const avgSessionDuration =
        consultations.length > 0
          ? Math.round(consultations.reduce((sum, c) => sum + (c.duration_minutes ?? 0), 0) / consultations.length / 60)
          : 0;

      // Repeat customer rate (within the analysis window)
      const userCounts = new Map<string, number>();
      for (const c of consultations) {
        userCounts.set(c.user_id, (userCounts.get(c.user_id) ?? 0) + 1);
      }
      const repeatUsers = Array.from(userCounts.values()).filter((count) => count > 1).length;
      const repeatCustomerRate = userCounts.size > 0 ? repeatUsers / userCounts.size : 0;

      return {
        totalConsultations,
        avgSessionDuration,
        repeatCustomerRate: Math.round(repeatCustomerRate * 100) / 100,
        responseRate: totalConsultations > 0 ? 0.95 : 0, // Placeholder - would require message-level data
      };
    } catch (err) {
      Logger.error('Failed to get totals', err);
      return { totalConsultations: 0, avgSessionDuration: 0, repeatCustomerRate: 0, responseRate: 0 };
    }
  },
};

export default AstrologerAnalyticsService;
