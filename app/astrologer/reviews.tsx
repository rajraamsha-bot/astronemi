import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft, Star, MessageCircle, Phone, Video, AlertCircle,
} from 'lucide-react-native';
import { astrologerDashboard } from '@/services/astrologer-dashboard';
import { Logger } from '@/services/logger';
import type { Review, RatingBreakdown } from '@/types/astrologer-dashboard';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function typeIcon(type: string) {
  switch (type) {
    case 'chat': return MessageCircle;
    case 'voice': return Phone;
    case 'video': return Video;
    default: return MessageCircle;
  }
}

export default function AstrologerReviewsScreen() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await astrologerDashboard.listReviews({ limit: 100 });
      setReviews(data);
    } catch (e) {
      Logger.error('Failed to load reviews', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const breakdown = useMemo<RatingBreakdown>(() => {
    const b: RatingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) {
        const key = r.rating as keyof RatingBreakdown;
        b[key] = (b[key] || 0) + 1;
      }
    });
    return b;
  }, [reviews]);

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  }, [reviews]);

  const totalReviews = reviews.length;
  const maxCount = Math.max(...Object.values(breakdown), 1);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reviews</Text>
        <View style={styles.emptyNav} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6B46C1" />
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.content}
        >
          <View style={styles.summaryCard}>
            <View style={styles.summaryLeft}>
              <Text style={styles.avgValue}>{avgRating.toFixed(1)}</Text>
              <View style={styles.starsRow}>
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={16} color="#FFD700" fill={s <= Math.round(avgRating) ? '#FFD700' : 'transparent'} />
                ))}
              </View>
              <Text style={styles.totalText}>{totalReviews} review{totalReviews !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.breakdown}>
              {[5,4,3,2,1].map(star => (
                <View key={star} style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{star}</Text>
                  <Star size={10} color="#FFD700" fill="#FFD700" />
                  <View style={styles.breakdownBarBg}>
                    <View style={[styles.breakdownBarFill, { width: `${((breakdown[star as keyof RatingBreakdown] || 0) / maxCount) * 100}%` }]} />
                  </View>
                  <Text style={styles.breakdownCount}>{breakdown[star as keyof RatingBreakdown] || 0}</Text>
                </View>
              ))}
            </View>
          </View>

          {reviews.length === 0 ? (
            <View style={styles.emptyState}>
              <AlertCircle size={40} color="#94A3B8" />
              <Text style={styles.emptyText}>No reviews yet</Text>
            </View>
          ) : (
            reviews.map(r => {
              const Icon = typeIcon(r.consultationType);
              return (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewUser}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{r.userName.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View>
                        <Text style={styles.userName}>{r.userName}</Text>
                        <Text style={styles.reviewDate}>{formatDate(r.createdAt)}</Text>
                      </View>
                    </View>
                    <View style={styles.ratingBadge}>
                      <Star size={12} color="#FFD700" fill="#FFD700" />
                      <Text style={styles.ratingText}>{r.rating}</Text>
                    </View>
                  </View>
                  {r.comment ? (
                    <Text style={styles.comment}>{r.comment}</Text>
                  ) : (
                    <Text style={styles.noComment}>No written comment</Text>
                  )}
                  <View style={styles.reviewFooter}>
                    <Icon size={14} color="#6B7280" />
                    <Text style={styles.footerText}>{r.consultationType.charAt(0).toUpperCase()+r.consultationType.slice(1)}</Text>
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F4FF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptyNav: { width: 40 },
  content: { padding: 16, paddingBottom: 40 },
  summaryCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#E5E5EA' },
  summaryLeft: { alignItems: 'center', justifyContent: 'center', paddingRight: 18, borderRightWidth: 1, borderRightColor: '#F3F4F6' },
  avgValue: { fontSize: 40, fontWeight: '800', color: '#111827' },
  starsRow: { flexDirection: 'row', gap: 2, marginTop: 4 },
  totalText: { fontSize: 12, color: '#6B7280', marginTop: 6 },
  breakdown: { flex: 1, paddingLeft: 18, justifyContent: 'center' },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  breakdownLabel: { width: 14, fontSize: 12, fontWeight: '600', color: '#374151', marginRight: 2 },
  breakdownBarBg: { flex: 1, height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, marginHorizontal: 8, overflow: 'hidden' },
  breakdownBarFill: { height: '100%', backgroundColor: '#FFD700', borderRadius: 4 },
  breakdownCount: { width: 20, fontSize: 11, color: '#6B7280', textAlign: 'right' },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#6B7280', marginTop: 12 },
  reviewCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E5E5EA' },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewUser: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#6B46C1' },
  userName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  reviewDate: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFBEA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingText: { fontSize: 12, fontWeight: '700', color: '#B45309' },
  comment: { fontSize: 14, color: '#374151', marginTop: 10, lineHeight: 20 },
  noComment: { fontSize: 13, color: '#9CA3AF', marginTop: 10, fontStyle: 'italic' },
  reviewFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  footerText: { fontSize: 12, color: '#6B7280' },
});
