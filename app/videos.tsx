/**
 * Videos screen — reads published `video` entries from the CMS.
 * Tapping a card opens the original source URL (YouTube etc.) in the
 * browser so we don't need a native video player in v1.
 */

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Eye, Play, Video as VideoIcon } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useCmsEntries } from '@/hooks/queries/useCmsEntries';
import {
  formatCompactCount,
  formatDuration,
  relativeTime,
  type CmsEntry,
} from '@/services/cms';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';

export default function VideosScreen() {
  const { data: videos = [], isLoading } = useCmsEntries('video', { limit: 50 });
  const [active, setActive] = useState('all');

  const categories = useMemo(() => {
    const set = new Set<string>();
    videos.forEach(v => { if (v.category) set.add(v.category); });
    return ['all', ...Array.from(set)];
  }, [videos]);

  const filtered = useMemo(
    () => (active === 'all' ? videos : videos.filter(v => v.category === active)),
    [videos, active],
  );

  return (
    <FeatureErrorBoundary featureName="Videos">
    <View style={styles.container}>
      <LinearGradient colors={['#DC143C', '#E53935', '#EF5350']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color="#FFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Videos</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {categories.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, active === c && styles.chipActive]}
              onPress={() => setActive(c)}
            >
              <Text style={[styles.chipText, active === c && styles.chipTextActive]}>
                {c === 'all' ? 'All' : c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.stateBox}>
            <VideoIcon color={Colors.textLight} size={40} />
            <Text style={styles.stateTitle}>No videos yet</Text>
            <Text style={styles.stateText}>
              Published content will appear here. Pull down to refresh.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map(v => (
              <VideoCard key={v.id} video={v} />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
    </FeatureErrorBoundary>
  );
}

function VideoCard({ video }: { video: CmsEntry }) {
  const openVideo = () => {
    router.push(`/content/${video.slug}` as never);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={openVideo} accessibilityRole="button">
      <View style={styles.thumbnailWrap}>
        {video.imageUrl && (
          <Image source={{ uri: video.imageUrl }} style={styles.thumbnail} />
        )}
        <View style={styles.playPill}>
          <Play color="#FFF" size={16} fill="#FFF" />
        </View>
        {video.durationSeconds ? (
          <View style={styles.durationPill}>
            <Text style={styles.durationText}>{formatDuration(video.durationSeconds)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {video.title}
        </Text>
        <Text style={styles.cardChannel}>{video.channelName ?? video.authorName ?? 'AstroNemi'}</Text>
        <View style={styles.cardMeta}>
          <Eye color={Colors.textLight} size={12} />
          <Text style={styles.cardMetaText}>{formatCompactCount(video.viewCount)} views</Text>
          <View style={styles.metaDot} />
          <Text style={styles.cardMetaText}>{relativeTime(video.publishedAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingBottom: 16 },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  content: { flex: 1 },
  chipRow: { paddingHorizontal: 16, paddingVertical: 16, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: '#E53935', borderColor: '#E53935' },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  chipTextActive: { color: '#FFF' },
  list: { paddingHorizontal: 16 },
  stateBox: { padding: 40, alignItems: 'center', gap: 8 },
  stateTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 8 },
  stateText: { fontSize: 13, color: Colors.textLight, textAlign: 'center' },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  thumbnailWrap: { position: 'relative', backgroundColor: '#222' },
  thumbnail: { width: '100%', height: 180 },
  playPill: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 44,
    height: 44,
    borderRadius: 22,
    marginLeft: -22,
    marginTop: -22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationPill: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  cardBody: { padding: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  cardChannel: { fontSize: 12, color: Colors.textLight, marginTop: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  cardMetaText: { fontSize: 11, color: Colors.textLight },
  metaDot: { width: 2, height: 2, borderRadius: 1, backgroundColor: Colors.textLight },
});
