/**
 * Generic CMS detail route.
 *
 * One screen renders every kind of content (blog / news / video / podcast
 * / course / meditation / mantra) keyed by the row's `slug`. The existing
 * list screens can navigate here with `router.push(`/content/${slug}`)`.
 *
 * Kind-specific affordances:
 *   - video / podcast: "Play on source" button opens `media_url` externally
 *   - mantra: renders Sanskrit + benefits from `metadata`
 *   - course: shows price, instructor, lessons, level
 */

import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  ExternalLink,
  Eye,
  Headphones,
  Sparkles,
  Star,
  Users,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Logger } from '@/services/logger';
import { VideoPlayer } from '@/components/VideoPlayer';
import {
  formatCompactCount,
  formatDuration,
  formatMinutesLabel,
  formatReadTime,
  relativeTime,
  type CmsEntry,
} from '@/services/cms';

function headerGradient(kind: CmsEntry['kind'] | undefined): [string, string, string] {
  switch (kind) {
    case 'blog':
    case 'course':
      return ['#6B46C1', '#805AD5', '#9F7AEA'];
    case 'news':
      return ['#1A237E', '#283593', '#3949AB'];
    case 'video':
      return ['#DC143C', '#E53935', '#EF5350'];
    case 'podcast':
      return ['#004D40', '#00695C', '#00796B'];
    case 'meditation':
      return ['#3949AB', '#5C6BC0', '#7986CB'];
    case 'mantra':
      return ['#BF360C', '#D84315', '#F4511E'];
    default:
      return [Colors.primary, Colors.primary, Colors.primary];
  }
}

function kindLabel(kind: CmsEntry['kind']): string {
  const map: Record<CmsEntry['kind'], string> = {
    blog: 'Article',
    news: 'News',
    video: 'Video',
    podcast: 'Podcast',
    course: 'Course',
    meditation: 'Meditation',
    mantra: 'Mantra',
  };
  return map[kind];
}

function mapRow(row: Record<string, unknown>): CmsEntry {
  // Same mapping as services/cms.ts. Kept inline so the detail route can
  // use `.single()` without importing a list helper.
  const tags = row.tags;
  return {
    id: String(row.id),
    kind: row.kind as CmsEntry['kind'],
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

function useCmsEntry(slug: string | undefined) {
  return useQuery<CmsEntry | null>({
    queryKey: ['cms-entry', slug ?? 'none'],
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!slug || !isSupabaseConfigured()) return null;
      try {
        const { data, error } = await supabase
          .from('cms_entries')
          .select('*')
          .eq('slug', slug)
          .eq('is_published', true)
          .maybeSingle();
        if (error) throw error;
        return data ? mapRow(data) : null;
      } catch (err) {
        Logger.error('Failed to fetch CMS entry', err, { slug });
        return null;
      }
    },
  });
}

export default function CmsDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: entry, isLoading } = useCmsEntry(slug);

  const gradient = useMemo(() => headerGradient(entry?.kind), [entry]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.stateBox}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft color={Colors.text} size={22} />
          </TouchableOpacity>
        </View>
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>Content unavailable</Text>
          <Text style={styles.stateText}>
            This entry was removed or unpublished. Head back and try another.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const sanskrit =
    typeof entry.metadata?.sanskrit === 'string' ? (entry.metadata.sanskrit as string) : null;
  const benefits = Array.isArray(entry.metadata?.benefits)
    ? (entry.metadata.benefits as string[])
    : [];

  const byline =
    entry.authorName ??
    entry.channelName ??
    entry.hostName ??
    entry.instructorName ??
    'AstroNemi';

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradient} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerBar}>
            <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
              <ArrowLeft color="#FFF" size={22} />
            </TouchableOpacity>
            <Text style={styles.headerKind}>{kindLabel(entry.kind)}</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.title}>{entry.title}</Text>
          {entry.summary && <Text style={styles.summary}>{entry.summary}</Text>}

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{byline}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.metaText}>{relativeTime(entry.publishedAt)}</Text>
            {entry.category && (
              <>
                <View style={styles.metaDot} />
                <Text style={styles.metaText}>{entry.category}</Text>
              </>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {entry.imageUrl && (
          <Image source={{ uri: entry.imageUrl }} style={styles.cover} resizeMode="cover" />
        )}

        <StatsStrip entry={entry} />

        {entry.kind === 'video' && entry.mediaUrl && (
          <View style={styles.playerBox}>
            <VideoPlayer source={entry.mediaUrl} poster={entry.imageUrl} />
          </View>
        )}

        {entry.kind === 'podcast' && entry.mediaUrl && (
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => Linking.openURL(entry.mediaUrl!).catch(() => undefined)}
            accessibilityRole="button"
          >
            <Headphones color="#FFF" size={18} />
            <Text style={styles.playText}>Listen on source</Text>
            <ExternalLink color="rgba(255,255,255,0.8)" size={14} />
          </TouchableOpacity>
        )}

        {entry.kind === 'mantra' && sanskrit && (
          <View style={styles.mantraBox}>
            <Text style={styles.mantraLabel}>Sanskrit</Text>
            <Text style={styles.mantraText}>{sanskrit}</Text>
          </View>
        )}

        {benefits.length > 0 && (
          <View style={styles.benefitsBox}>
            <View style={styles.benefitsHeader}>
              <Sparkles color={Colors.primary} size={16} />
              <Text style={styles.benefitsTitle}>Benefits</Text>
            </View>
            {benefits.map(b => (
              <Text key={b} style={styles.benefitItem}>• {b}</Text>
            ))}
          </View>
        )}

        {entry.kind === 'course' && (
          <CourseCTA entry={entry} />
        )}

        {entry.body && (
          <View style={styles.bodyBox}>
            <Text style={styles.bodyText}>{entry.body}</Text>
          </View>
        )}

        {!entry.body && entry.kind !== 'video' && entry.kind !== 'podcast' && entry.summary && (
          <View style={styles.bodyBox}>
            <Text style={styles.bodyText}>{entry.summary}</Text>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function StatsStrip({ entry }: { entry: CmsEntry }) {
  const chips: { icon: React.ReactNode; label: string }[] = [];

  const formattedDuration =
    entry.kind === 'blog' || entry.kind === 'news'
      ? formatReadTime(entry.durationSeconds)
      : entry.kind === 'meditation' || entry.kind === 'mantra'
      ? formatMinutesLabel(entry.durationSeconds)
      : formatDuration(entry.durationSeconds);

  if (formattedDuration) {
    chips.push({
      icon: <Clock color={Colors.textLight} size={12} />,
      label: formattedDuration,
    });
  }

  if (entry.viewCount > 0) {
    chips.push({
      icon: <Eye color={Colors.textLight} size={12} />,
      label: `${formatCompactCount(entry.viewCount)} views`,
    });
  }

  if (entry.lessonsCount) {
    chips.push({
      icon: <BookOpen color={Colors.textLight} size={12} />,
      label: `${entry.lessonsCount} lessons`,
    });
  }

  if (entry.studentCount > 0) {
    chips.push({
      icon: <Users color={Colors.textLight} size={12} />,
      label: `${formatCompactCount(entry.studentCount)} students`,
    });
  }

  if (entry.rating != null) {
    chips.push({
      icon: <Star color="#FFB300" size={12} fill="#FFB300" />,
      label: entry.rating.toFixed(1),
    });
  }

  if (chips.length === 0) return null;

  return (
    <View style={styles.statsStrip}>
      {chips.map((c, i) => (
        <View key={i} style={styles.statChip}>
          {c.icon}
          <Text style={styles.statChipText}>{c.label}</Text>
        </View>
      ))}
    </View>
  );
}

function CourseCTA({ entry }: { entry: CmsEntry }) {
  return (
    <View style={styles.ctaBox}>
      <View style={styles.ctaHeader}>
        <Text style={styles.ctaPrice}>{entry.priceInr > 0 ? `₹${entry.priceInr}` : 'Free'}</Text>
        {entry.level && (
          <View style={styles.levelPill}>
            <Text style={styles.levelPillText}>{entry.level}</Text>
          </View>
        )}
      </View>
      {entry.instructorName && (
        <Text style={styles.ctaInstructor}>Taught by {entry.instructorName}</Text>
      )}
      <TouchableOpacity style={styles.ctaButton} accessibilityRole="button">
        <Text style={styles.ctaButtonText}>
          {entry.priceInr > 0 ? 'Enrol now' : 'Start course'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  stateBox: { padding: 40, alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
  stateTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 8 },
  stateText: { fontSize: 13, color: Colors.textLight, textAlign: 'center' },

  header: { paddingBottom: 20 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerKind: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  summary: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    paddingHorizontal: 16,
    marginTop: 8,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  metaText: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.6)' },

  content: { flex: 1 },
  cover: { width: '100%', height: 220, backgroundColor: '#eee' },
  statsStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  playerBox: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statChipText: { fontSize: 11, color: Colors.textLight, fontWeight: '600' },

  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  playText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  mantraBox: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#F4511E',
    borderRadius: 10,
  },
  mantraLabel: { fontSize: 11, color: '#BF360C', fontWeight: '700', marginBottom: 6 },
  mantraText: {
    fontSize: 16,
    color: '#BF360C',
    lineHeight: 24,
    fontStyle: 'italic',
  },

  benefitsBox: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  benefitsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  benefitsTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  benefitItem: { fontSize: 13, color: Colors.text, lineHeight: 20 },

  ctaBox: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ctaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ctaPrice: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  levelPill: {
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelPillText: { color: Colors.primary, fontSize: 11, fontWeight: '700' },
  ctaInstructor: { fontSize: 13, color: Colors.textLight, marginBottom: 12 },
  ctaButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  ctaButtonText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  bodyBox: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bodyText: { fontSize: 14, color: Colors.text, lineHeight: 22 },
});
