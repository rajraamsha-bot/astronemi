/**
 * News screen — reads published `news` entries from the CMS.
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
import { ArrowLeft, Newspaper, TrendingUp } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useCmsEntries } from '@/hooks/queries/useCmsEntries';
import { formatReadTime, relativeTime, type CmsEntry } from '@/services/cms';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';

export default function NewsScreen() {
  const { data: articles = [], isLoading } = useCmsEntries('news', { limit: 50 });
  const [active, setActive] = useState('all');

  const categories = useMemo(() => {
    const set = new Set<string>();
    articles.forEach(a => { if (a.category) set.add(a.category); });
    return ['all', ...Array.from(set)];
  }, [articles]);

  const trending = useMemo(() => articles.filter(a => a.isTrending), [articles]);
  const filtered = useMemo(
    () => (active === 'all' ? articles : articles.filter(a => a.category === active)),
    [articles, active],
  );

  return (
    <FeatureErrorBoundary featureName="News">
    <View style={styles.container}>
      <LinearGradient colors={['#1A237E', '#283593', '#3949AB']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color="#FFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Astrology News</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {trending.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={16} color="#F44336" />
              <Text style={styles.sectionTitle}>Trending now</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {trending.map(a => (
                <TrendingCard key={a.id} article={a} />
              ))}
            </ScrollView>
          </View>
        )}

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
            <Newspaper color={Colors.textLight} size={40} />
            <Text style={styles.stateTitle}>No news yet</Text>
            <Text style={styles.stateText}>New stories appear here as soon as they&apos;re published.</Text>
          </View>
        ) : (
          <View style={styles.listSection}>
            {filtered.map(a => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
    </FeatureErrorBoundary>
  );
}

function TrendingCard({ article }: { article: CmsEntry }) {
  return (
    <TouchableOpacity style={styles.trendingCard} onPress={() => router.push(`/content/${article.slug}` as never)}>
      {article.imageUrl && (
        <Image source={{ uri: article.imageUrl }} style={styles.trendingImage} />
      )}
      <View style={styles.trendingOverlay}>
        <Text style={styles.trendingTitle} numberOfLines={2}>
          {article.title}
        </Text>
        <Text style={styles.trendingMeta}>{relativeTime(article.publishedAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function ArticleCard({ article }: { article: CmsEntry }) {
  return (
    <TouchableOpacity style={styles.articleCard} onPress={() => router.push(`/content/${article.slug}` as never)}>
      {article.imageUrl && (
        <Image source={{ uri: article.imageUrl }} style={styles.articleImage} />
      )}
      <View style={styles.articleBody}>
        {article.category && (
          <View style={styles.articleBadge}>
            <Text style={styles.articleBadgeText}>{article.category}</Text>
          </View>
        )}
        <Text style={styles.articleTitle} numberOfLines={2}>
          {article.title}
        </Text>
        {article.summary && (
          <Text style={styles.articleSummary} numberOfLines={2}>
            {article.summary}
          </Text>
        )}
        <View style={styles.articleMeta}>
          <Text style={styles.articleMetaText}>{article.authorName ?? 'AstroNemi'}</Text>
          <View style={styles.metaDot} />
          <Text style={styles.articleMetaText}>{relativeTime(article.publishedAt)}</Text>
          {article.durationSeconds ? (
            <>
              <View style={styles.metaDot} />
              <Text style={styles.articleMetaText}>{formatReadTime(article.durationSeconds)}</Text>
            </>
          ) : null}
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
  section: { marginTop: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
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
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  chipTextActive: { color: '#FFF' },
  listSection: { paddingHorizontal: 16 },
  stateBox: { padding: 40, alignItems: 'center', gap: 8 },
  stateTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 8 },
  stateText: { fontSize: 13, color: Colors.textLight, textAlign: 'center' },

  trendingCard: {
    width: 260,
    height: 160,
    marginLeft: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  trendingImage: { width: '100%', height: '100%', position: 'absolute' },
  trendingOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  trendingTitle: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  trendingMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 4 },

  articleCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  articleImage: { width: 110, height: 110 },
  articleBody: { flex: 1, padding: 12 },
  articleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  articleBadgeText: { color: Colors.primary, fontSize: 10, fontWeight: '700' },
  articleTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  articleSummary: { fontSize: 12, color: Colors.textLight, marginTop: 4, lineHeight: 16 },
  articleMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  articleMetaText: { fontSize: 11, color: Colors.textLight },
  metaDot: { width: 2, height: 2, borderRadius: 1, backgroundColor: Colors.textLight },
});
