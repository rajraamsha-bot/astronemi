/**
 * CMS service — reads published content from the `cms_entries` table and
 * normalises it for the UI. One table backs blog, news, videos, podcasts,
 * courses, meditations, and mantras. Per-kind extras live in `metadata`.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Logger } from './logger';

export type CmsKind =
  | 'blog'
  | 'news'
  | 'video'
  | 'podcast'
  | 'course'
  | 'meditation'
  | 'mantra';

export interface CmsEntry {
  id: string;
  kind: CmsKind;
  slug: string;

  title: string;
  summary: string | null;
  body: string | null;

  imageUrl: string | null;
  mediaUrl: string | null;

  authorName: string | null;
  authorAvatar: string | null;
  channelName: string | null;
  hostName: string | null;
  instructorName: string | null;

  category: string | null;
  tags: string[];
  level: string | null;

  durationSeconds: number | null;
  lessonsCount: number | null;
  episodeNumber: number | null;

  priceInr: number;
  isPremium: boolean;

  viewCount: number;
  likeCount: number;
  studentCount: number;

  rating: number | null;
  metadata: Record<string, unknown>;

  isFeatured: boolean;
  isTrending: boolean;

  publishedAt: string;
  createdAt: string;
}

export interface CmsListOptions {
  kind: CmsKind;
  category?: string;
  limit?: number;
  onlyFeatured?: boolean;
  search?: string;
}

function mapRow(row: Record<string, unknown>): CmsEntry {
  const tags = row.tags;
  return {
    id: String(row.id),
    kind: row.kind as CmsKind,
    slug: String(row.slug),
    title: String(row.title ?? ''),
    summary: (row.summary as string | null) ?? null,
    body: (row.body as string | null) ?? null,
    imageUrl: (row.image_url as string | null) ?? null,
    mediaUrl: (row.media_url as string | null) ?? null,
    authorName: (row.author_name as string | null) ?? null,
    authorAvatar: (row.author_avatar as string | null) ?? null,
    channelName: (row.channel_name as string | null) ?? null,
    hostName: (row.host_name as string | null) ?? null,
    instructorName: (row.instructor_name as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    tags: Array.isArray(tags) ? (tags as string[]) : [],
    level: (row.level as string | null) ?? null,
    durationSeconds: row.duration_seconds != null ? Number(row.duration_seconds) : null,
    lessonsCount: row.lessons_count != null ? Number(row.lessons_count) : null,
    episodeNumber: row.episode_number != null ? Number(row.episode_number) : null,
    priceInr: Number(row.price_inr ?? 0),
    isPremium: Boolean(row.is_premium),
    viewCount: Number(row.view_count ?? 0),
    likeCount: Number(row.like_count ?? 0),
    studentCount: Number(row.student_count ?? 0),
    rating: row.rating != null ? Number(row.rating) : null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    isFeatured: Boolean(row.is_featured),
    isTrending: Boolean(row.is_trending),
    publishedAt: String(row.published_at ?? new Date().toISOString()),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function listCmsEntries(options: CmsListOptions): Promise<CmsEntry[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    let query = supabase
      .from('cms_entries')
      .select('*')
      .eq('kind', options.kind)
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(options.limit ?? 50);

    if (options.category && options.category !== 'all') {
      query = query.eq('category', options.category);
    }
    if (options.onlyFeatured) {
      query = query.eq('is_featured', true);
    }
    if (options.search && options.search.trim()) {
      const term = options.search.trim();
      // Title OR summary ILIKE match. Supabase .or() uses a comma-separated list.
      query = query.or(`title.ilike.%${term}%,summary.ilike.%${term}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map(mapRow);
  } catch (err) {
    Logger.error('Failed to list CMS entries', err, { kind: options.kind });
    return [];
  }
}

// ─── Presentation helpers ────────────────────────────────────────────────────

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '';
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatMinutesLabel(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '';
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

export function formatReadTime(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '';
  const mins = Math.max(1, Math.round(seconds / 60));
  return `${mins} min read`;
}

export function formatCompactCount(n: number | null | undefined): string {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}
