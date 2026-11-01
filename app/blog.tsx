/**
 * Blog screen — reads published `blog` entries from the CMS.
 */

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, BookOpen, Clock, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useCmsEntries } from '@/hooks/queries/useCmsEntries';
import { formatReadTime, relativeTime, type CmsEntry } from '@/services/cms';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';

export default function BlogScreen() {
  const { data: posts = [], isLoading } = useCmsEntries('blog', { limit: 50 });
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const set = new Set<string>();
    posts.forEach(p => { if (p.category) set.add(p.category); });
    return ['all', ...Array.from(set)];
  }, [posts]);

  const filtered = useMemo(
    () => (activeCategory === 'all' ? posts : posts.filter(p => p.category === activeCategory)),
    [posts, activeCategory],
  );

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <FeatureErrorBoundary featureName="Blog">
    <View style={styles.container}>
      <LinearGradient colors={['#6B46C1', '#805AD5', '#9F7AEA']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color="#FFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Learn</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.headerSubtitle}>Articles and guides on Vedic astrology</Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {categories.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.categoryChip, activeCategory === c && styles.categoryChipActive]}
              onPress={() => setActiveCategory(c)}
            >
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === c && styles.categoryTextActive,
                ]}
              >
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
          <EmptyState />
        ) : (
          <>
            {featured && <FeaturedCard post={featured} />}

            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>Latest articles</Text>
              {rest.map(p => (
                <BlogCard key={p.id} post={p} />
              ))}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
    </FeatureErrorBoundary>
  );
}

function FeaturedCard({ post }: { post: CmsEntry }) {
  return (
    <TouchableOpacity style={styles.featuredCard} onPress={() => openPost(post)}>
      {post.imageUrl && (
        <Image source={{ uri: post.imageUrl }} style={styles.featuredImage} contentFit="cover" />
      )}
      <View style={styles.featuredMeta}>
        <View style={styles.featuredBadge}>
          <Sparkles color="#FFF" size={12} />
          <Text style={styles.featuredBadgeText}>Featured</Text>
        </View>
        <Text style={styles.featuredTitle}>{post.title}</Text>
        {post.summary && <Text style={styles.featuredSummary}>{post.summary}</Text>}
        <View style={styles.featuredFooter}>
          <Text style={styles.featuredAuthor}>{post.authorName ?? 'AstroNemi'}</Text>
          <View style={styles.dotSeparator} />
          <Clock size={12} color="rgba(255,255,255,0.8)" />
          <Text style={styles.featuredAuthor}>{formatReadTime(post.durationSeconds)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function BlogCard({ post }: { post: CmsEntry }) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => openPost(post)}>
      {post.imageUrl && <Image source={{ uri: post.imageUrl }} style={styles.cardImage} contentFit="cover" />}
      <View style={styles.cardBody}>
        {post.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{post.category}</Text>
          </View>
        )}
        <Text style={styles.cardTitle} numberOfLines={2}>
          {post.title}
        </Text>
        {post.summary && (
          <Text style={styles.cardSummary} numberOfLines={2}>
            {post.summary}
          </Text>
        )}
        <View style={styles.cardMeta}>
          <Text style={styles.cardMetaText}>{post.authorName ?? 'AstroNemi'}</Text>
          <View style={styles.metaDot} />
          <Text style={styles.cardMetaText}>{relativeTime(post.publishedAt)}</Text>
          <View style={styles.metaDot} />
          <Text style={styles.cardMetaText}>{formatReadTime(post.durationSeconds)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState() {
  return (
    <View style={styles.stateBox}>
      <BookOpen color={Colors.textLight} size={40} />
      <Text style={styles.stateTitle}>No articles yet</Text>
      <Text style={styles.stateText}>
        New writing appears here as soon as it&apos;s published.
      </Text>
    </View>
  );
}

function openPost(post: CmsEntry) {
  router.push(`/content/${post.slug}` as never);
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
  categoryRow: { paddingHorizontal: 16, paddingVertical: 16, gap: 8 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  categoryTextActive: { color: '#FFF' },
  stateBox: { padding: 40, alignItems: 'center', gap: 8 },
  stateTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 8 },
  stateText: { fontSize: 13, color: Colors.textLight, textAlign: 'center' },

  featuredCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.primary,
    marginBottom: 20,
  },
  featuredImage: { width: '100%', height: 180 },
  featuredMeta: { padding: 16, backgroundColor: 'rgba(107,70,193,0.85)' },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 10,
  },
  featuredBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  featuredTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 6 },
  featuredSummary: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 18 },
  featuredFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  featuredAuthor: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  dotSeparator: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.6)' },

  listSection: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardImage: { width: 110, height: 110 },
  cardBody: { flex: 1, padding: 12 },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  categoryBadgeText: { color: Colors.primary, fontSize: 10, fontWeight: '700' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  cardSummary: { fontSize: 12, color: Colors.textLight, marginTop: 4, lineHeight: 16 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6, flexWrap: 'wrap' },
  cardMetaText: { fontSize: 11, color: Colors.textLight },
  metaDot: { width: 2, height: 2, borderRadius: 1, backgroundColor: Colors.textLight },
});
