/**
 * Courses screen — reads published `course` entries from the CMS.
 * A "free vs premium" split plus a level filter. Price and premium flag
 * come from the CMS row; payment integration hooks in via `price_inr`.
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
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Lock,
  Star,
  Users,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useCmsEntries } from '@/hooks/queries/useCmsEntries';
import { formatCompactCount, type CmsEntry } from '@/services/cms';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';

type Level = 'all' | 'Beginner' | 'Intermediate' | 'Advanced';

function formatCourseDuration(seconds: number | null | undefined): string {
  if (!seconds) return '';
  const hours = Math.round(seconds / 3600);
  if (hours >= 1) return `${hours} hr`;
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

export default function CoursesScreen() {
  const { data: courses = [], isLoading } = useCmsEntries('course', { limit: 50 });
  const [level, setLevel] = useState<Level>('all');

  const filtered = useMemo(
    () => (level === 'all' ? courses : courses.filter(c => c.level === level)),
    [courses, level],
  );

  return (
    <FeatureErrorBoundary featureName="Courses">
    <View style={styles.container}>
      <LinearGradient colors={['#6B46C1', '#805AD5', '#9F7AEA']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color="#FFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Courses</Text>
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
          {(['all', 'Beginner', 'Intermediate', 'Advanced'] as Level[]).map(l => (
            <TouchableOpacity
              key={l}
              style={[styles.chip, level === l && styles.chipActive]}
              onPress={() => setLevel(l)}
            >
              <Text style={[styles.chipText, level === l && styles.chipTextActive]}>
                {l === 'all' ? 'All levels' : l}
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
            <BookOpen color={Colors.textLight} size={40} />
            <Text style={styles.stateTitle}>No courses yet</Text>
            <Text style={styles.stateText}>New courses will appear here when they go live.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map(c => (
              <CourseCard key={c.id} course={c} />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
    </FeatureErrorBoundary>
  );
}

function CourseCard({ course }: { course: CmsEntry }) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/content/${course.slug}` as never)}>
      {course.imageUrl && (
        <Image source={{ uri: course.imageUrl }} style={styles.image} contentFit="cover" />
      )}
      <View style={styles.body}>
        <View style={styles.topRow}>
          {course.level && (
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{course.level}</Text>
            </View>
          )}
          {course.isPremium && (
            <View style={styles.premiumBadge}>
              <Lock color="#FFF" size={10} />
              <Text style={styles.premiumText}>Premium</Text>
            </View>
          )}
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {course.title}
        </Text>
        {course.summary && (
          <Text style={styles.summary} numberOfLines={2}>
            {course.summary}
          </Text>
        )}

        {course.instructorName && (
          <Text style={styles.instructor}>by {course.instructorName}</Text>
        )}

        <View style={styles.statsRow}>
          {course.lessonsCount ? (
            <View style={styles.stat}>
              <BookOpen size={12} color={Colors.textLight} />
              <Text style={styles.statText}>{course.lessonsCount} lessons</Text>
            </View>
          ) : null}
          {course.durationSeconds ? (
            <View style={styles.stat}>
              <Clock size={12} color={Colors.textLight} />
              <Text style={styles.statText}>{formatCourseDuration(course.durationSeconds)}</Text>
            </View>
          ) : null}
          {course.studentCount > 0 && (
            <View style={styles.stat}>
              <Users size={12} color={Colors.textLight} />
              <Text style={styles.statText}>{formatCompactCount(course.studentCount)}</Text>
            </View>
          )}
          {course.rating != null && (
            <View style={styles.stat}>
              <Star size={12} color="#FFB300" fill="#FFB300" />
              <Text style={styles.statText}>{course.rating}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.price}>
            {course.priceInr > 0 ? `₹${course.priceInr}` : 'Free'}
          </Text>
          <TouchableOpacity style={styles.cta}>
            <Text style={styles.ctaText}>{course.isPremium ? 'Enrol' : 'Start'}</Text>
          </TouchableOpacity>
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
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  chipTextActive: { color: '#FFF' },
  list: { paddingHorizontal: 16 },
  stateBox: { padding: 40, alignItems: 'center', gap: 8 },
  stateTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 8 },
  stateText: { fontSize: 13, color: Colors.textLight, textAlign: 'center' },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },
  image: { width: '100%', height: 160, backgroundColor: '#eee' },
  body: { padding: 14 },
  topRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  levelBadge: {
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelText: { color: Colors.primary, fontSize: 10, fontWeight: '700' },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E53935',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  premiumText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '700', color: Colors.text },
  summary: { fontSize: 13, color: Colors.textLight, marginTop: 4, lineHeight: 18 },
  instructor: { fontSize: 12, color: Colors.textLight, marginTop: 6, fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap', marginTop: 10 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 11, color: Colors.textLight },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  price: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  cta: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
  },
  ctaText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
});
