/**
 * Mantras screen — reads published `mantra` entries from the CMS.
 * Sanskrit text and benefits live in `metadata` (`sanskrit` string,
 * `benefits` string[]).
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
import { ArrowLeft, Flame, Play, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useCmsEntries } from '@/hooks/queries/useCmsEntries';
import { formatMinutesLabel, type CmsEntry } from '@/services/cms';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';

function sanskritFrom(entry: CmsEntry): string | null {
  const s = entry.metadata?.sanskrit;
  return typeof s === 'string' ? s : null;
}

function benefitsFrom(entry: CmsEntry): string[] {
  const b = entry.metadata?.benefits;
  return Array.isArray(b) ? (b as string[]) : [];
}

export default function MantrasScreen() {
  const { data: mantras = [], isLoading } = useCmsEntries('mantra', { limit: 50 });
  const [active, setActive] = useState('all');

  const categories = useMemo(() => {
    const set = new Set<string>();
    mantras.forEach(m => { if (m.category) set.add(m.category); });
    return ['all', ...Array.from(set)];
  }, [mantras]);

  const filtered = useMemo(
    () => (active === 'all' ? mantras : mantras.filter(m => m.category === active)),
    [mantras, active],
  );

  return (
    <FeatureErrorBoundary featureName="Mantras">
    <View style={styles.container}>
      <LinearGradient colors={['#BF360C', '#D84315', '#F4511E']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color="#FFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mantras</Text>
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
            <ActivityIndicator color="#F4511E" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.stateBox}>
            <Flame color={Colors.textLight} size={40} />
            <Text style={styles.stateTitle}>No mantras yet</Text>
            <Text style={styles.stateText}>New mantras appear here when they&apos;re published.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map(m => (
              <MantraCard key={m.id} mantra={m} />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
    </FeatureErrorBoundary>
  );
}

function MantraCard({ mantra }: { mantra: CmsEntry }) {
  const sanskrit = sanskritFrom(mantra);
  const benefits = benefitsFrom(mantra);

  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/content/${mantra.slug}` as never)}>
      {mantra.imageUrl && (
        <Image source={{ uri: mantra.imageUrl }} style={styles.cover} />
      )}
      <View style={styles.body}>
        <Text style={styles.title}>{mantra.title}</Text>
        {sanskrit && (
          <Text style={styles.sanskrit} numberOfLines={2}>
            {sanskrit}
          </Text>
        )}
        {mantra.summary && (
          <Text style={styles.summary} numberOfLines={2}>
            {mantra.summary}
          </Text>
        )}
        {benefits.length > 0 && (
          <View style={styles.benefitRow}>
            <Sparkles size={12} color="#F4511E" />
            <Text style={styles.benefits} numberOfLines={1}>
              {benefits.slice(0, 3).join(' · ')}
            </Text>
          </View>
        )}
        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {formatMinutesLabel(mantra.durationSeconds) || '—'}
          </Text>
          {mantra.category && (
            <>
              <View style={styles.metaDot} />
              <Text style={styles.metaText}>{mantra.category}</Text>
            </>
          )}
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
  chipActive: { backgroundColor: '#F4511E', borderColor: '#F4511E' },
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
  title: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sanskrit: {
    fontSize: 13,
    color: '#BF360C',
    marginTop: 4,
    fontStyle: 'italic',
  },
  summary: { fontSize: 12, color: Colors.textLight, marginTop: 4, lineHeight: 16 },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  benefits: { fontSize: 11, color: Colors.textLight, flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  metaText: { fontSize: 11, color: Colors.textLight },
  metaDot: { width: 2, height: 2, borderRadius: 1, backgroundColor: Colors.textLight },
  play: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F4511E',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
