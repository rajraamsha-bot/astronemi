/**
 * Meditation screen — reads published `meditation` entries from the CMS.
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
import { ArrowLeft, Clock, Moon, Play } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useCmsEntries } from '@/hooks/queries/useCmsEntries';
import { formatMinutesLabel, type CmsEntry } from '@/services/cms';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';

type Filter = 'all' | string;

export default function MeditationScreen() {
  const { data: meditations = [], isLoading } = useCmsEntries('meditation', { limit: 50 });
  const [active, setActive] = useState<Filter>('all');

  const categories = useMemo(() => {
    const set = new Set<string>();
    meditations.forEach(m => { if (m.category) set.add(m.category); });
    return ['all', ...Array.from(set)];
  }, [meditations]);

  const filtered = useMemo(
    () => (active === 'all' ? meditations : meditations.filter(m => m.category === active)),
    [meditations, active],
  );

  return (
    <FeatureErrorBoundary featureName="Meditation">
    <View style={styles.container}>
      <LinearGradient colors={['#3949AB', '#5C6BC0', '#7986CB']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color="#FFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Meditations</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.headerSubtitle}>Guided sessions aligned with your chart</Text>
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
            <ActivityIndicator color="#3949AB" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.stateBox}>
            <Moon color={Colors.textLight} size={40} />
            <Text style={styles.stateTitle}>No meditations yet</Text>
            <Text style={styles.stateText}>Guided sessions will appear here as they are published.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map(m => (
              <MeditationCard key={m.id} meditation={m} />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
    </FeatureErrorBoundary>
  );
}

function MeditationCard({ meditation }: { meditation: CmsEntry }) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/content/${meditation.slug}` as never)}>
      {meditation.imageUrl && (
        <Image source={{ uri: meditation.imageUrl }} style={styles.cover} />
      )}
      <View style={styles.body}>
        {meditation.level && (
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{meditation.level}</Text>
          </View>
        )}
        <Text style={styles.title}>{meditation.title}</Text>
        {meditation.summary && <Text style={styles.summary}>{meditation.summary}</Text>}
        <View style={styles.meta}>
          <Clock size={12} color={Colors.textLight} />
          <Text style={styles.metaText}>{formatMinutesLabel(meditation.durationSeconds)}</Text>
        </View>
      </View>
      <View style={styles.play}>
        <Play color="#FFF" size={18} fill="#FFF" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingBottom: 20 },
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
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 16,
    marginTop: 8,
  },
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
  chipActive: { backgroundColor: '#3949AB', borderColor: '#3949AB' },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  chipTextActive: { color: '#FFF' },
  list: { paddingHorizontal: 16 },
  stateBox: { padding: 40, alignItems: 'center', gap: 8 },
  stateTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 8 },
  stateText: { fontSize: 13, color: Colors.textLight, textAlign: 'center' },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  cover: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#eee' },
  body: { flex: 1 },
  levelBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8EAF6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  levelText: { fontSize: 10, color: '#3949AB', fontWeight: '700' },
  title: { fontSize: 14, fontWeight: '700', color: Colors.text },
  summary: { fontSize: 12, color: Colors.textLight, marginTop: 4, lineHeight: 16 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText: { fontSize: 11, color: Colors.textLight },
  play: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3949AB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
