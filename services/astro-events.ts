/**
 * Astro events — shared calendar of transits / festivals / eclipses /
 * retrogrades / workshops. Admin-maintained. Users can bookmark events
 * they want to track.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Logger } from './logger';

export type AstroEventKind = 'transit' | 'festival' | 'eclipse' | 'retrograde' | 'workshop';

export interface AstroEvent {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  kind: AstroEventKind;
  occursAt: string;
  durationMinutes: number | null;
  location: string | null;
  imageUrl: string | null;
  expectedParticipants: number;
  isBookmarked: boolean;
}

interface EventRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  kind: string;
  occurs_at: string;
  duration_minutes: number | null;
  location: string | null;
  image_url: string | null;
  expected_participants: number | null;
  is_published: boolean;
}

function mapRow(row: EventRow, bookmarkedSet: Set<string>): AstroEvent {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    kind: (row.kind as AstroEventKind) ?? 'transit',
    occursAt: row.occurs_at,
    durationMinutes: row.duration_minutes,
    location: row.location,
    imageUrl: row.image_url,
    expectedParticipants: row.expected_participants ?? 0,
    isBookmarked: bookmarkedSet.has(row.id),
  };
}

export async function listAstroEvents(options: {
  kind?: AstroEventKind | 'all';
  includePast?: boolean;
  userId?: string;
} = {}): Promise<AstroEvent[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    let query = supabase
      .from('astro_events')
      .select('*')
      .eq('is_published', true)
      .order('occurs_at', { ascending: true })
      .limit(60);

    if (options.kind && options.kind !== 'all') {
      query = query.eq('kind', options.kind);
    }
    if (!options.includePast) {
      query = query.gte('occurs_at', new Date().toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    let bookmarkedSet = new Set<string>();
    if (options.userId) {
      const { data: bookmarks } = await supabase
        .from('astro_event_bookmarks')
        .select('event_id')
        .eq('user_id', options.userId);
      bookmarkedSet = new Set(
        (bookmarks ?? []).map(b => String((b as { event_id: string }).event_id)),
      );
    }

    return (data ?? []).map(row => mapRow(row as EventRow, bookmarkedSet));
  } catch (err) {
    Logger.error('Failed to list astro events', err);
    return [];
  }
}

export async function toggleEventBookmark(
  userId: string,
  eventId: string,
): Promise<{ bookmarked: boolean } | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data: existing, error: selErr } = await supabase
      .from('astro_event_bookmarks')
      .select('user_id')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .maybeSingle();
    if (selErr) throw selErr;

    if (existing) {
      const { error } = await supabase
        .from('astro_event_bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId);
      if (error) throw error;
      return { bookmarked: false };
    }

    const { error } = await supabase
      .from('astro_event_bookmarks')
      .insert({ user_id: userId, event_id: eventId });
    if (error) throw error;
    return { bookmarked: true };
  } catch (err) {
    Logger.error('Failed to toggle event bookmark', err);
    return null;
  }
}
