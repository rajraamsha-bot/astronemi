/**
 * Live streams service — lists scheduled and currently-live streams from
 * the `live_streams` table, and manages per-user reminders in
 * `live_stream_reminders`.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Logger } from './logger';

export interface LiveStream {
  id: string;
  astrologerId: string | null;
  astrologerName: string | null;
  astrologerAvatar: string | null;

  title: string;
  description: string | null;
  topic: string | null;
  coverImage: string | null;

  scheduledAt: string;
  durationMinutes: number;
  isLive: boolean;
  endedAt: string | null;
  viewerCount: number;

  channelName: string | null;
  priceInr: number;
  isFree: boolean;

  createdAt: string;
}

interface StreamRow {
  id: string;
  astrologer_id: string | null;
  title: string;
  description: string | null;
  topic: string | null;
  cover_image: string | null;
  scheduled_at: string;
  duration_minutes: number;
  is_live: boolean;
  ended_at: string | null;
  viewer_count: number;
  channel_name: string | null;
  price_inr: number;
  is_free: boolean;
  created_at: string;
  astrologers?:
    | { id: string; name: string | null; avatar: string | null }
    | Array<{ id: string; name: string | null; avatar: string | null }>
    | null;
}

function mapRow(row: StreamRow): LiveStream {
  const astro = Array.isArray(row.astrologers) ? row.astrologers[0] : row.astrologers;
  return {
    id: row.id,
    astrologerId: row.astrologer_id,
    astrologerName: astro?.name ?? null,
    astrologerAvatar: astro?.avatar ?? null,
    title: row.title,
    description: row.description,
    topic: row.topic,
    coverImage: row.cover_image,
    scheduledAt: row.scheduled_at,
    durationMinutes: row.duration_minutes,
    // M3 fix: coalesce NULL columns that the DB doesn't default.
    isLive: row.is_live ?? false,
    endedAt: row.ended_at,
    viewerCount: row.viewer_count ?? 0,
    channelName: row.channel_name,
    priceInr: Number(row.price_inr ?? 0),
    // `is_free` must default to *false* when the DB column is NULL — a
    // stream priced in INR with no explicit flag is paid, not free.
    isFree: row.is_free ?? (Number(row.price_inr ?? 0) === 0),
    createdAt: row.created_at,
  };
}

export async function listLiveStreams(
  options: { onlyUpcoming?: boolean; limit?: number } = {},
): Promise<LiveStream[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    let query = supabase
      .from('live_streams')
      .select('*, astrologers!live_streams_astrologer_id_fkey(id, name, avatar)')
      .is('ended_at', null)
      .order('is_live', { ascending: false })
      .order('scheduled_at', { ascending: true })
      .limit(options.limit ?? 50);

    if (options.onlyUpcoming) {
      query = query.gte('scheduled_at', new Date().toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(row => mapRow(row as StreamRow));
  } catch (err) {
    Logger.error('Failed to list live streams', err);
    return [];
  }
}

export async function listUserReminders(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured() || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('live_stream_reminders')
      .select('stream_id')
      .eq('user_id', userId);
    if (error) throw error;
    return (data ?? []).map(r => String((r as { stream_id: string }).stream_id));
  } catch (err) {
    Logger.error('Failed to list reminders', err);
    return [];
  }
}

export async function toggleStreamReminder(
  userId: string,
  streamId: string,
): Promise<{ subscribed: boolean } | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data: existing, error: selErr } = await supabase
      .from('live_stream_reminders')
      .select('user_id')
      .eq('user_id', userId)
      .eq('stream_id', streamId)
      .maybeSingle();
    if (selErr) throw selErr;

    if (existing) {
      const { error } = await supabase
        .from('live_stream_reminders')
        .delete()
        .eq('user_id', userId)
        .eq('stream_id', streamId);
      if (error) throw error;
      return { subscribed: false };
    }

    const { error } = await supabase
      .from('live_stream_reminders')
      .insert({ user_id: userId, stream_id: streamId });
    if (error) throw error;
    return { subscribed: true };
  } catch (err) {
    Logger.error('Failed to toggle reminder', err);
    return null;
  }
}
