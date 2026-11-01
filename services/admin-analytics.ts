/**
 * Admin analytics service — thin wrapper around the `admin_*` RPCs added
 * in migration 007. Each function returns `null` on any error so the
 * dashboard can render a graceful fallback without crashing.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Logger } from './logger';

export interface AdminOverview {
  totalUsers: number;
  activeUsers: number;
  newUsers7d: number;
  newUsersPrev7d: number;
  totalAstrologers: number;
  activeAstrologers: number;
  totalConsultations: number;
  consultations7d: number;
  consultationsPrev7d: number;
  grossRevenueInr: number;
  revenue7dInr: number;
  revenuePrev7dInr: number;
  activeDisputes: number;
  avgSessionMinutes: number;
}

export interface RevenuePoint {
  day: string;
  consultations: number;
  revenueInr: number;
}

export interface AdminActivity {
  activityAt: string;
  actorName: string;
  action:
    | 'signup'
    | 'consultation_booked'
    | 'consultation_completed'
    | 'order_placed'
    | string;
  detail: string;
}

export interface TopAstrologer {
  astrologerId: string;
  name: string;
  consultations: number;
  revenueInr: number;
  rating: number;
}

// ─── Overview ───────────────────────────────────────────────────────────────

interface OverviewRow {
  total_users: number | string;
  active_users: number | string;
  new_users_7d: number | string;
  new_users_prev_7d: number | string;
  total_astrologers: number | string;
  active_astrologers: number | string;
  total_consultations: number | string;
  consultations_7d: number | string;
  consultations_prev_7d: number | string;
  gross_revenue_inr: number | string;
  revenue_7d_inr: number | string;
  revenue_prev_7d_inr: number | string;
  active_disputes: number | string;
  avg_session_minutes: number | string;
}

function toNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function fetchAdminOverview(): Promise<AdminOverview | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.rpc('admin_overview_metrics');
    if (error) throw error;
    const row = Array.isArray(data) ? (data[0] as OverviewRow | undefined) : (data as OverviewRow | null);
    if (!row) return null;
    return {
      totalUsers: toNum(row.total_users),
      activeUsers: toNum(row.active_users),
      newUsers7d: toNum(row.new_users_7d),
      newUsersPrev7d: toNum(row.new_users_prev_7d),
      totalAstrologers: toNum(row.total_astrologers),
      activeAstrologers: toNum(row.active_astrologers),
      totalConsultations: toNum(row.total_consultations),
      consultations7d: toNum(row.consultations_7d),
      consultationsPrev7d: toNum(row.consultations_prev_7d),
      grossRevenueInr: toNum(row.gross_revenue_inr),
      revenue7dInr: toNum(row.revenue_7d_inr),
      revenuePrev7dInr: toNum(row.revenue_prev_7d_inr),
      activeDisputes: toNum(row.active_disputes),
      avgSessionMinutes: toNum(row.avg_session_minutes),
    };
  } catch (err) {
    Logger.error('admin_overview_metrics failed', err);
    return null;
  }
}

// ─── Timeseries ─────────────────────────────────────────────────────────────

export async function fetchRevenueTimeseries(days = 14): Promise<RevenuePoint[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase.rpc('admin_revenue_timeseries', { days });
    if (error) throw error;
    return (data ?? []).map((row: { day: string; consultations: number | string; revenue_inr: number | string }) => ({
      day: String(row.day),
      consultations: toNum(row.consultations),
      revenueInr: toNum(row.revenue_inr),
    }));
  } catch (err) {
    Logger.error('admin_revenue_timeseries failed', err);
    return [];
  }
}

// ─── Recent activity ────────────────────────────────────────────────────────

export async function fetchRecentActivity(limit = 15): Promise<AdminActivity[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase.rpc('admin_recent_activity', { max_rows: limit });
    if (error) throw error;
    return (data ?? []).map(
      (row: { activity_at: string; actor_name: string; action: string; detail: string | null }) => ({
        activityAt: row.activity_at,
        actorName: row.actor_name ?? 'User',
        action: row.action ?? 'event',
        detail: row.detail ?? '',
      }),
    );
  } catch (err) {
    Logger.error('admin_recent_activity failed', err);
    return [];
  }
}

// ─── Top astrologers ────────────────────────────────────────────────────────

export async function fetchTopAstrologers(limit = 5): Promise<TopAstrologer[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase.rpc('admin_top_astrologers', { limit_count: limit });
    if (error) throw error;
    return (data ?? []).map(
      (row: {
        astrologer_id: string;
        name: string;
        consultations: number | string;
        revenue_inr: number | string;
        rating: number | string;
      }) => ({
        astrologerId: row.astrologer_id,
        name: row.name,
        consultations: toNum(row.consultations),
        revenueInr: toNum(row.revenue_inr),
        rating: toNum(row.rating),
      }),
    );
  } catch (err) {
    Logger.error('admin_top_astrologers failed', err);
    return [];
  }
}

// ─── Presentation helpers ───────────────────────────────────────────────────

export function formatInr(value: number): string {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(2)} L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)}K`;
  return `₹${Math.round(value)}`;
}

export function formatPercentDelta(current: number, previous: number): {
  label: string;
  direction: 'up' | 'down' | 'flat';
} {
  if (previous <= 0) {
    if (current > 0) return { label: '+new', direction: 'up' };
    return { label: '0%', direction: 'flat' };
  }
  const delta = ((current - previous) / previous) * 100;
  const rounded = Math.abs(delta) < 0.1 ? 0 : delta;
  if (rounded > 0) return { label: `+${rounded.toFixed(1)}%`, direction: 'up' };
  if (rounded < 0) return { label: `${rounded.toFixed(1)}%`, direction: 'down' };
  return { label: '0%', direction: 'flat' };
}
