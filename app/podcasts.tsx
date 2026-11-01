/**
 * Podcasts screen — reads published `podcast` entries from the CMS.
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
import { ArrowLeft, Headphones, Play } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useCmsEntries } from '@/hooks/queries/useCmsEntries';
import { formatDuration, type CmsEntry } from '@/services/cms';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';

export default function PodcastsScreen() {
  const { data: podcasts = [], isLoading } = useCmsEntries('podcast', { limit: 50 });
  const [active, setActive] = useState('all');

  const categories = useMemo(() => {
    const set = new Set<string>();
    podcasts.forEach(p => { if (p.category) set.add(p.category); });
    return ['all', ...Array.from(set)];
  }, [podcasts]);

  const filtered = useMemo(
    () => (active === 'all' ? podcasts : podcasts.filter(p => p.category === active)),
    [podcasts, active],
  );

  return (
    <FeatureErrorBoundary featureName="Podcasts">
    <View style={styles.container}>
      <LinearGradient colors={['#004D40', '#00695C', '#00796B']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color="#FFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Podcasts</Text>
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
            <ActivityIndicator color="#00796B" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.stateBox}>
            <Headphones color={Colors.textLight} size={40} />
            <Text style={styles.stateTitle}>No episodes yet</Text>
            <Text style={styles.stateText}>New episodes arrive here as they go live.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map(p => (
              <EpisodeCard key={p.id} episode={p} />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
    </FeatureErrorBoundary>
  );
}

function EpisodeCard({ episode }: { episode: CmsEntry }) {
  const open = () => {
    router.push(`/content/${episode.slug}` as never);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={open} accessibilityRole="button">
      {episode.imageUrl && (
        <Image source={{ uri: episode.imageUrl }} style={styles.cover} />
      )}
      <View style={styles.body}>
        {episode.episodeNumber != null && (
          <Text style={styles.episodeLabel}>Episode {episode.episodeNumber}</Text>
        )}
        <Text style={styles.title} numberOfLines={2}>
          {episode.title}
        </Text>
        {episode.summary && (
          <Text style={styles.summary} numberOfLines={2}>
            {episode.summary}
          </Text>
        )}
        <View style={styles.meta}>
          <Text style={styles.metaText}>{episode.hostName ?? episode.authorName ?? 'Host'}</Text>
          {episode.durationSeconds ? (
            <>
              <View style={styles.metaDot} />
              <Text style={styles.metaText}>{formatDuration(episode.durationSeconds)}</Text>
            </>
          ) : null}
        </View>
      </View>
      <View style={styles.playBtn}>
        <Play color="#FFF" size={18} fill="#FFF" />
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
  chipActive: { backgroundColor: '#00796B', borderColor: '#00796B' },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  chipTextActive: { color: '#FFF' },
  list: { paddingHorizontal: 16 },
  stateBox: { padding: 40, alignItems: 'center', gap: 8 },
  stateTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 8 },
  stateText: { fontSize: 13, color: Colors.textLight, textAlign: 'center' },

  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    gap: 12,
  },
  cover: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#eee' },
  body: { flex: 1 },
  episodeLabel: { fontSize: 10, color: '#00796B', fontWeight: '700', marginBottom: 2 },
  title: { fontSize: 14, fontWeight: '700', color: Colors.text },
  summary: { fontSize: 12, color: Colors.textLight, marginTop: 4, lineHeight: 16 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  metaText: { fontSize: 11, color: Colors.textLight },
  metaDot: { width: 2, height: 2, borderRadius: 1, backgroundColor: Colors.textLight },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00796B',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
