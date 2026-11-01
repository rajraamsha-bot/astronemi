import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, useLocalSearchParams, router, Stack } from 'expo-router';
import { Clock, Users, MessageCircle, Phone, Video, Star, CheckCircle, Calendar, ChevronRight, ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { astrologersApi } from '@/services/api';
import { useApp } from '@/contexts/AppContext';
import { createConsultation } from '@/services/chat';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/lib/database.types';
import { Logger } from '@/services/logger';
import { PushNotificationService } from '@/services/push-notification-service';
import { isAIFeaturesEnabled } from '@/config/ai-features';

type DbAstrologer = Database['public']['Tables']['astrologers']['Row'];

export default function BookingScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type: 'chat' | 'call' | 'video' }>();
  const insets = useSafeAreaInsets();
  const { walletBalance } = useApp();
  const { user } = useAuth();
  
  const [astrologer, setAstrologer] = useState<DbAstrologer | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<'instant' | 'scheduled'>('instant');

  const loadAstrologer = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await astrologersApi.getById(id);
      if (data) {
        setAstrologer(data);
      }
    } catch (err) {
      Logger.error('Failed to load astrologer', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadAstrologer();
    }
  }, [id, loadAstrologer]);

  const sessionType = type || 'chat';
  const minBalance = (astrologer?.price_per_minute || 20) * 5;

  const timeSlots = [
    '10:00 AM', '11:00 AM', '12:00 PM',
    '02:00 PM', '03:00 PM', '04:00 PM',
    '05:00 PM', '06:00 PM', '07:00 PM',
  ];

  const handleJoinQueue = async () => {
    if (!user) {
      Alert.alert('Error', 'Please login to book a session.');
      return;
    }

    try {
      // Create the consultation server-side (AI -> active, human -> pending).
      const consultation = await createConsultation(user.id, id!, sessionType);

      if (!consultation) {
        Alert.alert('Booking Failed', 'Could not initiate session. Please try again.');
        return;
      }

      // Route to the session using the REAL consultation id. The chat screen
      // handles the waiting state for human astrologers and starts immediately
      // for the AI astrologer.
      if (sessionType === 'chat') {
        router.replace(`/chat/${consultation.id}`);
      } else {
        router.replace(`/call/${consultation.id}?type=${sessionType}`);
      }
    } catch (error: unknown) {
      Logger.error('Error in handleJoinQueue', error);
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong.';
      Alert.alert('Booking Restricted', errorMessage);
    }
  };

  // Convert the selected "HH:MM AM/PM" slot into a Date for TOMORROW.
  const slotToDate = useCallback((slot: string): Date | null => {
    const [timePart, meridiem] = slot.split(' ');
    if (!timePart) return null;
    const timeColon = timePart.indexOf(':');
    if (timeColon < 0) return null;
    const h = Number(timePart.slice(0, timeColon));
    const m = Number(timePart.slice(timeColon + 1));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    // 12 AM -> 0, 12 PM -> 12, otherwise PM adds 12.
    let hour = h % 12;
    if (meridiem?.toUpperCase() === 'PM') hour += 12;
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(hour, m, 0, 0);
    return date;
  }, []);

  if (astrologer?.is_ai && !isAIFeaturesEnabled()) {
    return <Redirect href="/(tabs)/astrologers" />;
  }

  const handleScheduleBooking = async () => {
    if (!selectedSlot) return;
    if (!user) {
      Alert.alert(
        '🔐 Login Required',
        'Please login to book a consultation.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/login') },
        ]
      );
      return;
    }
    try {
      const scheduledFor = slotToDate(selectedSlot);
      const consultation = await createConsultation(user.id, id!, sessionType, scheduledFor ?? undefined);
      if (!consultation) {
        Alert.alert('Booking Failed', 'Could not save booking. Please try again.');
        return;
      }

      // Persist the chosen slot server-side (scheduled_at) AND schedule a
      // local reminder so the promised notification actually fires. Previously
      // neither happened — the confirmation was cosmetic.
      if (scheduledFor && scheduledFor.getTime() > Date.now()) {
        PushNotificationService.scheduleConsultationReminder(
          consultation.id,
          astrologer?.name || 'your astrologer',
          scheduledFor
        );
      }

      Alert.alert(
        '📅 Booking Confirmed!',
        `Your ${sessionType} session with ${astrologer?.name} is scheduled for tomorrow at ${selectedSlot}.\n\nYou will receive a reminder before the session.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: unknown) {
      Logger.error('Scheduling error', error);
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      Alert.alert('Scheduling Failed', errorMessage);
    }
  };

  const getSessionIcon = () => {
    switch (sessionType) {
      case 'chat': return <MessageCircle size={20} color={Colors.white} />;
      case 'call': return <Phone size={20} color={Colors.white} />;
      case 'video': return <Video size={20} color={Colors.white} />;
      default: return <MessageCircle size={20} color={Colors.white} />;
    }
  };

  const getSessionLabel = () => {
    switch (sessionType) {
      case 'chat': return 'Chat';
      case 'call': return 'Voice Call';
      case 'video': return 'Video Call';
      default: return 'Chat';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 10, color: Colors.textLight }}>Loading booking details...</Text>
      </SafeAreaView>
    );
  }

  if (!astrologer) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={styles.errorText}>Astrologer not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 10 }}>
          <Text style={{ color: Colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: insets.top + 50 }]}>
        <View style={styles.bookingHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book Session</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.astrologerHeaderSection}>
            <Image source={{ uri: astrologer.avatar_url || '' }} style={styles.astrologerHeaderImage} contentFit="cover" />
            <View style={styles.astrologerHeaderInfo}>
              <Text style={styles.astrologerHeaderName}>{astrologer.name}</Text>
              <View style={styles.ratingRow}>
                <Star size={16} color={Colors.gold} fill={Colors.gold} />
                <Text style={styles.ratingText}>{astrologer.rating}</Text>
                <Text style={styles.reviewsText}>({astrologer.total_reviews} reviews)</Text>
              </View>
              <View style={styles.sessionTypeBadge}>
                {getSessionIcon()}
                <Text style={styles.sessionTypeText}>{getSessionLabel()} Session</Text>
              </View>
            </View>
          </View>

          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Rate</Text>
              <Text style={styles.priceValue}>₹{astrologer.price_per_minute}/min</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Min Balance Required</Text>
              <Text style={styles.priceValue}>₹{minBalance}</Text>
            </View>
            <View style={[styles.priceRow, styles.balanceRow]}>
              <Text style={styles.priceLabel}>Your Balance</Text>
              <Text style={[
                styles.priceValue,
                { color: walletBalance >= minBalance ? Colors.success : Colors.error }
              ]}>
                ₹{walletBalance}
              </Text>
            </View>
            {walletBalance < minBalance && (
              <TouchableOpacity 
                style={styles.rechargeButton}
                onPress={() => router.push('/wallet')}
              >
                <Text style={styles.rechargeButtonText}>Add Money to Continue</Text>
                <ChevronRight size={20} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.bookingTypeSection}>
            <Text style={styles.sectionTitle}>Booking Type</Text>
            <View style={styles.bookingTypeRow}>
              <TouchableOpacity
                style={[
                  styles.bookingTypeCard,
                  bookingType === 'instant' && styles.bookingTypeSelected
                ]}
                onPress={() => setBookingType('instant')}
              >
                <Clock size={24} color={bookingType === 'instant' ? Colors.primary : Colors.textLight} />
                <Text style={[
                  styles.bookingTypeTitle,
                  bookingType === 'instant' && styles.bookingTypeTitleSelected
                ]}>
                  Instant
                </Text>
                <Text style={styles.bookingTypeDesc}>Join queue now</Text>
                {bookingType === 'instant' && (
                  <CheckCircle size={20} color={Colors.primary} style={styles.checkIcon} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.bookingTypeCard,
                  bookingType === 'scheduled' && styles.bookingTypeSelected
                ]}
                onPress={() => setBookingType('scheduled')}
              >
                <Calendar size={24} color={bookingType === 'scheduled' ? Colors.primary : Colors.textLight} />
                <Text style={[
                  styles.bookingTypeTitle,
                  bookingType === 'scheduled' && styles.bookingTypeTitleSelected
                ]}>
                  Schedule
                </Text>
                <Text style={styles.bookingTypeDesc}>Book for later</Text>
                {bookingType === 'scheduled' && (
                  <CheckCircle size={20} color={Colors.primary} style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {bookingType === 'instant' && (astrologer.is_ai || astrologer.is_online) && (
            <View style={[styles.queueInfoCard, { backgroundColor: Colors.success + '10', borderColor: Colors.success + '20', borderWidth: 1 }]}>
              <View style={styles.onlineIndicator}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>{astrologer.is_ai ? 'INSTANT' : 'AVAILABLE NOW'}</Text>
              </View>
              <Text style={styles.queueEstimate}>
                {astrologer.is_ai
                  ? 'AI astrologer — starts immediately, 24/7.'
                  : `${astrologer.name} is online and ready to connect.`}
              </Text>
              <Text style={styles.waitTime}>
                {astrologer.is_ai
                  ? 'No waiting. Your session begins as soon as you tap below.'
                  : 'You will connect once the astrologer accepts your request.'}
              </Text>
            </View>
          )}

          {bookingType === 'scheduled' && (
            <View style={styles.slotsSection}>
              <Text style={styles.sectionTitle}>Select Time Slot (Tomorrow)</Text>
              <View style={styles.slotsGrid}>
                {timeSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.slotCard,
                      selectedSlot === slot && styles.slotSelected
                    ]}
                    onPress={() => setSelectedSlot(slot)}
                  >
                    <Text style={[
                      styles.slotText,
                      selectedSlot === slot && styles.slotTextSelected
                    ]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {bookingType === 'instant' ? (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                ((!astrologer.is_ai && !astrologer.is_online) || walletBalance < minBalance) && styles.buttonDisabled
              ]}
              onPress={handleJoinQueue}
              disabled={(!astrologer.is_ai && !astrologer.is_online) || walletBalance < minBalance}
            >
              <Users size={20} color={Colors.white} />
              <Text style={styles.primaryButtonText}>
                {astrologer.is_ai
                  ? 'Start AI Session'
                  : astrologer.is_online
                    ? `Connect with ${getSessionLabel()}`
                    : 'Currently Offline'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!selectedSlot || walletBalance < minBalance) && styles.buttonDisabled
              ]}
              onPress={handleScheduleBooking}
              disabled={!selectedSlot || walletBalance < minBalance}
            >
              <Calendar size={20} color={Colors.white} />
              <Text style={styles.primaryButtonText}>Confirm Booking</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  backButton: {
    padding: 8,
  },
  astrologerHeaderSection: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: Colors.white,
    gap: 16,
    alignItems: 'center',
  },
  astrologerHeaderImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  astrologerHeaderInfo: {
    flex: 1,
  },
  astrologerHeaderName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  reviewsText: {
    fontSize: 13,
    color: Colors.textLight,
  },
  sessionTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
  },
  sessionTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  priceCard: {
    backgroundColor: Colors.white,
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  balanceRow: {
    borderBottomWidth: 0,
  },
  priceLabel: {
    fontSize: 15,
    color: Colors.textLight,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  rechargeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3EF',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
    gap: 4,
  },
  rechargeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  bookingTypeSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  bookingTypeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bookingTypeCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  bookingTypeSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF3EF',
  },
  bookingTypeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
  },
  bookingTypeTitleSelected: {
    color: Colors.primary,
  },
  bookingTypeDesc: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  checkIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  slotsSection: {
    paddingHorizontal: 20,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotCard: {
    width: '31%',
    backgroundColor: Colors.white,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  slotSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF3EF',
  },
  slotText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  slotTextSelected: {
    color: Colors.primary,
  },
  bottomPadding: {
    height: 100,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 30,
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  queueContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  queueCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  queueImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    borderWidth: 4,
    borderColor: Colors.primary,
  },
  queueTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  queueAstrologer: {
    fontSize: 16,
    color: Colors.textLight,
    marginTop: 4,
    marginBottom: 24,
  },
  queueInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  queueInfoItem: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  queueDivider: {
    width: 1,
    height: 60,
    backgroundColor: Colors.border,
  },
  queueNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 8,
  },
  queueLabel: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 4,
  },
  queueTips: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 4,
  },
  leaveQueueButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  leaveQueueText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.error,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  queueInfoCard: {
    backgroundColor: '#E8F5E9',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.success,
    letterSpacing: 0.5,
  },
  queueEstimate: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  waitTime: {
    fontSize: 13,
    color: Colors.textLight,
  },
});
