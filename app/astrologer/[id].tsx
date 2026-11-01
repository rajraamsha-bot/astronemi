import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useLocalSearchParams, router, Stack } from 'expo-router';
import {
  Star, BadgeCheck, MessageCircle, Phone, Video, ChevronLeft,
  MessageSquareOff, MoreVertical
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { astrologersApi, reviewsApi } from '@/services/api';
import { blockUser, reportAstrologer } from '@/services/chat';
import { useApp } from '@/contexts/AppContext';
import { Database } from '@/lib/database.types';
import { Typography } from '@/constants/theme';
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';
import { Logger } from '@/services/logger';
import { isAIFeaturesEnabled } from '@/config/ai-features';

type DbAstrologer = Database['public']['Tables']['astrologers']['Row'];

interface Review {
  id: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  date: string;
  consultationType: 'chat' | 'call' | 'video';
}

interface RawReviewData {
  id: string;
  user_name?: string;
  user_avatar?: string;
  rating: number;
  comment?: string;
  created_at?: string;
}

export default function AstrologerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { walletBalance } = useApp();
  
  const [astrologer, setAstrologer] = useState<DbAstrologer | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'chat' | 'call' | 'video'>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [astroRes, reviewsRes] = await Promise.all([
        astrologersApi.getById(id),
        reviewsApi.getByAstrologerId(id)
      ]);

      if (astroRes.data) {
        setAstrologer(astroRes.data);
      }

      if (reviewsRes.data) {
        const mappedReviews: Review[] = (reviewsRes.data as RawReviewData[]).map((r) => ({
          id: r.id,
          userName: r.user_name || 'User',
          userAvatar: r.user_avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff7e?w=100',
          rating: r.rating,
          comment: r.comment || '',
          date: r.created_at?.split('T')[0] || '',
          consultationType: 'chat',
        }));
        setReviews(mappedReviews);
      }
    } catch (err) {
      Logger.error('Failed to load astrologer data', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, loadData]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 60 }]}>
        <View style={styles.imageContainer}>
          <SkeletonLoader width="100%" height={400} borderRadius={24} />
        </View>
        <View style={styles.content}>
          <SkeletonLoader width={200} height={32} borderRadius={8} />
          <SkeletonLoader width={150} height={18} borderRadius={4} style={{ marginTop: 12 }} />
          
          <View style={[styles.statsRow, { marginTop: 24 }]}>
            <SkeletonLoader width="30%" height={80} borderRadius={12} />
            <SkeletonLoader width="30%" height={80} borderRadius={12} />
            <SkeletonLoader width="30%" height={80} borderRadius={12} />
          </View>
          
          <View style={{ marginTop: 32 }}>
            <SkeletonLoader width={120} height={20} borderRadius={4} />
            <View style={[styles.specializations, { marginTop: 12 }]}>
              <SkeletonLoader width={100} height={36} borderRadius={12} />
              <SkeletonLoader width={120} height={36} borderRadius={12} />
              <SkeletonLoader width={80} height={36} borderRadius={12} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (astrologer?.is_ai && !isAIFeaturesEnabled()) {
    return <Redirect href="/(tabs)/astrologers" />;
  }

  if (!astrologer) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={styles.errorText}>Astrologer not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: Colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filteredReviews = filterType === 'all' 
    ? reviews 
    : reviews.filter(r => r.consultationType === filterType);

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : astrologer.rating || 4.5;

  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    percentage: reviews.length > 0 ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 : 0,
  }));

  const handleBlockAction = () => {
    Alert.alert(
      'Block Astrologer?',
      'You will no longer see this astrologer in your recommendations or search results.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Block', 
          style: 'destructive',
          onPress: async () => {
            await blockUser(id);
            Alert.alert('Blocked', 'This expert has been blocked.');
            router.back();
          }
        }
      ]
    );
  };

  const submitReport = async (reason: string) => {
    const ok = await reportAstrologer(id, reason, 'profile');
    Alert.alert(
      ok ? 'Reported' : 'Report failed',
      ok
        ? 'Thank you. Our moderation team will review this case.'
        : 'Failed to submit report. Please try again.',
    );
  };

  const handleReportAction = () => {
    // Cross-platform reason picker (Alert.prompt is iOS-only).
    Alert.alert(
      'Report Expert',
      'Choose a reason for reporting this profile.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Harassment or abuse', onPress: () => { void submitReport('Harassment or abuse'); } },
        { text: 'Spam or scam', onPress: () => { void submitReport('Spam or scam'); } },
        { text: 'Inappropriate content', onPress: () => { void submitReport('Inappropriate content'); } },
      ],
    );
  };

  const showSafetyOptions = () => {
    Alert.alert(
      'Safety Options',
      'Choose an action to handle your interaction with this expert.',
      [
        { text: 'Report Profile', onPress: handleReportAction },
        { text: 'Block Expert', style: 'destructive', onPress: handleBlockAction },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.imageContainer, { marginTop: insets.top + 60 }]}>
          <Image source={{ uri: astrologer.avatar_url || '' }} style={styles.image} contentFit="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.imageGradient}
          />
          <TouchableOpacity 
            style={[styles.backButton, { top: 20 }]}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color={Colors.white} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.moreButton, { top: 20 }]}
            onPress={showSafetyOptions}
          >
            <MoreVertical size={24} color={Colors.white} />
          </TouchableOpacity>

          {astrologer.is_online && (
            <View style={[styles.onlineBadge, { top: 20, right: 70 }]}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { fontFamily: Typography.bold }]}>{astrologer.name}</Text>
            {astrologer.is_verified && (
              <BadgeCheck size={24} color={Colors.primary} fill={Colors.primary} />
            )}
          </View>

          <Text style={[styles.expertise, { fontFamily: Typography.medium }]}>{astrologer.expertise}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Star size={20} color={Colors.gold} fill={Colors.gold} />
              <Text style={[styles.statValue, { fontFamily: Typography.bold }]}>{astrologer.rating}</Text>
              <Text style={[styles.statLabel, { fontFamily: Typography.regular }]}>{astrologer.total_reviews} reviews</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { fontFamily: Typography.bold }]}>{astrologer.experience_years}+</Text>
              <Text style={[styles.statLabel, { fontFamily: Typography.regular }]}>Years Experience</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { fontFamily: Typography.bold }]}>{((astrologer.total_consultations || 0) / 1000).toFixed(1)}k</Text>
              <Text style={[styles.statLabel, { fontFamily: Typography.regular }]}>Consultations</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: Typography.semiBold }]}>Specializations</Text>
            <View style={styles.specializations}>
              {astrologer.specializations?.map((spec, idx) => (
                <View key={idx} style={styles.specTag}>
                  <Text style={styles.specText}>{spec}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Languages</Text>
            <Text style={styles.languageText}>{astrologer.languages?.join(' · ')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Consultation Fee</Text>
            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>Per Minute Rate</Text>
              <Text style={styles.price}>Rs.{astrologer.price_per_minute}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.aboutText}>
              With {astrologer.experience_years} years of experience in {astrologer.specializations?.[0] || 'Astrology'},
              {' '}{astrologer.name || 'this astrologer'} offers personalized Vedic astrology guidance.
            </Text>
          </View>

          {/* Reviews Section */}
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Reviews & Ratings</Text>
            </View>

            {/* Rating Summary */}
            <View style={styles.ratingSummaryCard}>
              <View style={styles.ratingSummaryLeft}>
                <Text style={styles.bigRating}>{averageRating.toFixed(1)}</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      color={Colors.gold}
                      fill={star <= Math.round(averageRating) ? Colors.gold : 'transparent'}
                    />
                  ))}
                </View>
                <Text style={styles.totalReviewsText}>{reviews.length} reviews</Text>
              </View>
              <View style={styles.ratingBars}>
                {ratingDistribution.map(({ star, count, percentage }) => (
                  <View key={star} style={styles.ratingBarRow}>
                    <Text style={styles.ratingBarStar}>{star}</Text>
                    <View style={styles.ratingBarTrack}>
                      <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
                    </View>
                    <Text style={styles.ratingBarCount}>{count}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterTabs}>
              {(['all', 'chat', 'call', 'video'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.filterTab, filterType === type && styles.filterTabActive]}
                  onPress={() => setFilterType(type)}
                >
                  <Text style={[styles.filterTabText, filterType === type && styles.filterTabTextActive]}>
                    {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Reviews List */}
            {filteredReviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Image source={{ uri: review.userAvatar }} style={styles.reviewAvatar} contentFit="cover" />
                  <View style={styles.reviewInfo}>
                    <Text style={styles.reviewUserName}>{review.userName}</Text>
                    <View style={styles.reviewMeta}>
                    <View style={styles.reviewStars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            color={Colors.gold}
                            fill={star <= review.rating ? Colors.gold : 'transparent'}
                          />
                        ))}
                      </View>
                      <Text style={styles.reviewType}>
                        · {review.consultationType.charAt(0).toUpperCase() + review.consultationType.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.reviewDate}>{review.date}</Text>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </View>
            ))}

            {filteredReviews.length === 0 && (
              <View style={styles.noReviewsContainer}>
                <MessageSquareOff size={48} color={Colors.textLight} style={styles.noReviewsIcon} />
                <Text style={styles.noReviewsTitle}>No Reviews Found</Text>
                <Text style={styles.noReviewsText}>Reviews from completed consultations will appear here.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.footerBalance}>
          <Text style={styles.balanceLabel}>Wallet: Rs.{walletBalance}</Text>
          <TouchableOpacity onPress={() => router.push('/wallet')}>
            <Text style={styles.rechargeText}>Recharge</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.chatButton, !astrologer.is_online && styles.buttonDisabled]}
            onPress={() => router.push(`/booking/${astrologer.id}?type=chat`)}
          >
            <MessageCircle size={20} color={Colors.white} />
            <Text style={styles.actionButtonText}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.callButton, !astrologer.is_online && styles.buttonDisabled]}
            onPress={() => router.push(`/booking/${astrologer.id}?type=call`)}
          >
            <Phone size={20} color={Colors.white} />
            <Text style={styles.actionButtonText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.videoButton, !astrologer.is_online && styles.buttonDisabled]}
            onPress={() => router.push(`/booking/${astrologer.id}?type=video`)}
          >
            <Video size={20} color={Colors.white} />
            <Text style={styles.actionButtonText}>Video</Text>
          </TouchableOpacity>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  imageContainer: {
    position: 'relative' as const,
    height: 400,
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: Colors.border,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  backButton: {
    position: 'absolute' as const,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  moreButton: {
    position: 'absolute' as const,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  onlineText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.success,
  },
  content: {
    padding: 20,
  },
  nameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 8,
  },
  name: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  expertise: {
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 4,
    textAlign: 'center' as const,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  specializations: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  specTag: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  specText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  languageText: {
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
  },
  priceCard: {
    backgroundColor: Colors.primary,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  priceLabel: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.9,
  },
  price: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.white,
  },
  aboutText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center' as const,
    marginTop: 40,
  },
  footerContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
  },
  footerBalance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  rechargeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 25,
    gap: 6,
  },
  chatButton: {
    backgroundColor: '#4CAF50',
  },
  callButton: {
    backgroundColor: '#2196F3',
  },
  videoButton: {
    backgroundColor: '#9C27B0',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  onlineBadge: {
    position: 'absolute' as const,
    right: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  writeReviewButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  writeReviewText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  ratingSummaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  ratingSummaryLeft: {
    alignItems: 'center',
    marginRight: 20,
  },
  bigRating: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.text,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  totalReviewsText: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  ratingBars: {
    flex: 1,
    justifyContent: 'center',
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingBarStar: {
    width: 12,
    fontSize: 12,
    color: Colors.textLight,
  },
  ratingBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 3,
  },
  ratingBarCount: {
    width: 20,
    fontSize: 11,
    color: Colors.textLight,
    textAlign: 'right',
  },
  filterTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#FFF',
  },
  reviewCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  reviewInfo: {
    flex: 1,
  },
  reviewUserName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewType: {
    fontSize: 12,
    color: Colors.textLight,
    marginLeft: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  reviewComment: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  helpfulText: {
    fontSize: 13,
    color: '#999',
  },
  helpfulTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  noReviewsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noReviewsIcon: {
    marginBottom: 12,
    opacity: 0.5,
  },
  noReviewsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  noReviewsText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalContainer: {
    backgroundColor: Colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  modalContent: {
    padding: 20,
  },
  astrologerPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  astrologerPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  astrologerPreviewName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  astrologerPreviewExpertise: {
    fontSize: 14,
    color: Colors.textLight,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  ratingSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  ratingStarButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.gold,
    textAlign: 'center',
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  commentInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 24,
    minHeight: 120,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
