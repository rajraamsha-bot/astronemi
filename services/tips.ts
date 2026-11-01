/**
 * Tips Service
 *
 * In-app tips from users to astrologers. 100% to astrologer.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Logger } from '@/services/logger';
import { errorReporting } from '@/services/error-reporting';

export interface TipPreset {
  id: string;
  amountInr: number;
  emoji: string;
  label: string;
  displayOrder: number;
}

export interface Tip {
  id: string;
  userId: string;
  astrologerId: string;
  consultationId: string | null;
  amountInr: number;
  message: string | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: string;
  completedAt: string | null;
}

interface PresetRow {
  id: string;
  amount_inr: number;
  emoji: string;
  label: string;
  display_order: number;
}

interface TipRow {
  id: string;
  user_id: string;
  astrologer_id: string;
  consultation_id: string | null;
  amount_inr: number;
  message: string | null;
  status: Tip['status'];
  created_at: string;
  completed_at: string | null;
}

function mapPreset(row: PresetRow): TipPreset {
  return {
    id: row.id,
    amountInr: Number(row.amount_inr),
    emoji: row.emoji,
    label: row.label,
    displayOrder: row.display_order,
  };
}

function mapTip(row: TipRow): Tip {
  return {
    id: row.id,
    userId: row.user_id,
    astrologerId: row.astrologer_id,
    consultationId: row.consultation_id,
    amountInr: Number(row.amount_inr),
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

const FALLBACK_PRESETS: TipPreset[] = [
  { id: 'fallback-51',   amountInr: 51,   emoji: '\u2615',  label: 'Buy a coffee',     displayOrder: 0 },
  { id: 'fallback-101',  amountInr: 101,  emoji: '\uD83C\uDF38',  label: 'Thank you',        displayOrder: 1 },
  { id: 'fallback-251',  amountInr: 251,  emoji: '\uD83C\uDF1F',  label: 'You are amazing',  displayOrder: 2 },
  { id: 'fallback-501',  amountInr: 501,  emoji: '\uD83C\uDFAB',  label: 'Brilliant reading', displayOrder: 3 },
  { id: 'fallback-1001', amountInr: 1001, emoji: '\uD83D\uDE4F',  label: 'Life-changing',    displayOrder: 4 },
];

export const tipsService = {
  async getPresets(): Promise<TipPreset[]> {
    if (!isSupabaseConfigured()) {
      return FALLBACK_PRESETS;
    }
    const { data, error } = await supabase
      .from('tip_presets')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      Logger.error('Failed to fetch tip presets', error);
      return FALLBACK_PRESETS;
    }
    return (data as PresetRow[]).map(mapPreset);
  },

  async sendTip(opts: {
    userId: string;
    astrologerId: string;
    amountInr: number;
    consultationId?: string;
    message?: string;
  }): Promise<{ success: boolean; message: string; tipId?: string; newBalance?: number }> {
    if (!isSupabaseConfigured()) {
      return { success: false, message: 'Tip service unavailable' };
    }

    if (opts.amountInr <= 0) {
      return { success: false, message: 'Tip amount must be positive' };
    }
    if (opts.amountInr > 100000) {
      return { success: false, message: 'Tip cannot exceed Rs 1,00,000' };
    }

    try {
      const { data, error } = await supabase.rpc('send_tip', {
        p_user_id: opts.userId,
        p_astrologer_id: opts.astrologerId,
        p_amount_inr: opts.amountInr,
        p_consultation_id: opts.consultationId ?? null,
        p_message: opts.message ?? null,
      });

      if (error) {
        Logger.error('send_tip RPC failed', error, {
          userId: opts.userId,
          astrologerId: opts.astrologerId,
        });
        if (error.message?.includes('insufficient')) {
          return { success: false, message: 'Insufficient wallet balance' };
        }
        return { success: false, message: 'Failed to send tip' };
      }

      const result = data as { success: boolean; message: string; tip_id?: string; new_balance?: number };
      if (!result?.success) {
        return { success: false, message: result?.message ?? 'Tip failed' };
      }

      return {
        success: true,
        message: result.message,
        tipId: result.tip_id,
        newBalance: result.new_balance,
      };
    } catch (e) {
      errorReporting.captureException(e as Error, { tags: { service: 'tips' } });
      return { success: false, message: 'Tip failed' };
    }
  },

  async getMyTips(userId: string, limit = 50): Promise<Tip[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('tips')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      Logger.error('Failed to fetch my tips', error, { userId });
      return [];
    }
    return (data as TipRow[]).map(mapTip);
  },

  async getReceivedTips(astrologerId: string, limit = 50): Promise<Tip[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('tips')
      .select('*')
      .eq('astrologer_id', astrologerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      Logger.error('Failed to fetch received tips', error, { astrologerId });
      return [];
    }
    return (data as TipRow[]).map(mapTip);
  },

  async getMetrics(): Promise<{ total: number; totalAmount: number; avgAmount: number; tips7d: number; amount7d: number }> {
    if (!isSupabaseConfigured()) {
      return { total: 0, totalAmount: 0, avgAmount: 0, tips7d: 0, amount7d: 0 };
    }
    const { data, error } = await supabase
      .from('tip_metrics')
      .select('*')
      .maybeSingle();
    if (error) {
      Logger.error('Failed to fetch tip metrics', error);
      return { total: 0, totalAmount: 0, avgAmount: 0, tips7d: 0, amount7d: 0 };
    }
    const row = (data ?? {}) as { total_tips?: number; total_amount_inr?: number; avg_tip_inr?: number; tips_7d?: number; amount_7d?: number };
    return {
      total: Number(row.total_tips ?? 0),
      totalAmount: Number(row.total_amount_inr ?? 0),
      avgAmount: Number(row.avg_tip_inr ?? 0),
      tips7d: Number(row.tips_7d ?? 0),
      amount7d: Number(row.amount_7d ?? 0),
    };
  },
};

export default tipsService;
