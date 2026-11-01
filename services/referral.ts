/**
 * Referral service — reads real referrals from Supabase and exposes
 * aggregated stats + history. Falls back to an empty, graceful shape
 * when Supabase isn't configured (dev / offline).
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Logger } from './logger';

export interface ReferralHistoryItem {
  id: string;
  name: string;
  date: string; // yyyy-mm-dd
  status: 'completed' | 'pending';
  reward: number;
}

export interface ReferralStatsData {
  referralCode: string;
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalEarned: number;
  currentMonthEarned: number;
  referralHistory: ReferralHistoryItem[];
}

function emptyStats(code: string): ReferralStatsData {
  return {
    referralCode: code,
    totalReferrals: 0,
    successfulReferrals: 0,
    pendingReferrals: 0,
    totalEarned: 0,
    currentMonthEarned: 0,
    referralHistory: [],
  };
}

/**
 * Fetch the caller's referral stats from the `referrals` table. The DB
 * enforces "users view own referrals" via RLS, so an anon session without
 * auth won't return any rows. In that case we return an empty shape.
 */
export async function getReferralStats(
  userId: string,
  referralCode: string,
): Promise<ReferralStatsData> {
  if (!userId) return emptyStats(referralCode);
  if (!isSupabaseConfigured()) return emptyStats(referralCode);

  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('id, referred_id, status, reward_amount, created_at, users!referrals_referred_id_fkey(name)')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      Logger.error('Failed to load referrals', error, { userId });
      return emptyStats(referralCode);
    }

    const rows = (data ?? []) as Array<{
      id: string;
      referred_id: string;
      status: string;
      reward_amount: number | null;
      created_at: string;
      users: { name: string | null } | { name: string | null }[] | null;
    }>;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let totalEarned = 0;
    let currentMonthEarned = 0;
    let successful = 0;
    let pending = 0;

    const history: ReferralHistoryItem[] = rows.map(r => {
      const isCompleted = r.status === 'completed' || r.status === 'rewarded';
      const reward = Number(r.reward_amount ?? 0);
      if (isCompleted) {
        successful += 1;
        totalEarned += reward;
        if (new Date(r.created_at).getTime() >= monthStart) {
          currentMonthEarned += reward;
        }
      } else {
        pending += 1;
      }

      const userField = Array.isArray(r.users) ? r.users[0] : r.users;
      return {
        id: r.id,
        name: userField?.name ?? 'Friend',
        date: new Date(r.created_at).toISOString().slice(0, 10),
        status: isCompleted ? 'completed' : 'pending',
        reward,
      };
    });

    return {
      referralCode,
      totalReferrals: rows.length,
      successfulReferrals: successful,
      pendingReferrals: pending,
      totalEarned,
      currentMonthEarned,
      referralHistory: history,
    };
  } catch (err) {
    Logger.error('Unexpected referral fetch error', err as Error);
    return emptyStats(referralCode);
  }
}
