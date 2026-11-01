/**
 * Astrologer Console — Dashboard Home
 *
 * The first screen an astrologer sees after login. Shows at-a-glance:
 *  - Online/offline toggle
 *  - Today's earnings
 *  - Pending consultation requests (with Accept/Decline)
 *  - Active consultation (with "End Call" CTA)
 *  - Quick stats
 *
 * In production this would live in a separate Expo app (e.g.
 * `astrologer.astronemi.app`). For development, it shares the
 * same monorepo.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Wallet, MessageCircle, Phone, Video, Star, Users,
  TrendingUp, Clock, CheckCircle, X, PhoneOff,
  Calendar, User,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { astrologerDashboard } from '@/services/astrologer-dashboard';
import { Logger } from '@/services/logger';
import { createButtonA11yProps } from '@/utils/accessibility-helpers';
import type {
  AstrologerProfile, AstrologerConsultation,
} from '@/types/astrologer-dashboard';

const INCOME_SYMBOL = '₹';

function formatINR(amount: number): string {
  if (amount >= 100000) return `${INCOME_SYMBOL}${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `${INCOME_SYMBOL}${(amount / 1000).toFixed(1)}K`;
  return `${INCOME_SYMBOL}${amount}`;
}

function consultationTypeIcon(type: string) {
  switch (type) {
    case 'chat': return MessageCircle;
    case 'voice': return Phone;
    case 'video': return Video;
    default: return MessageCircle;
  }
}

export default function AstrologerConsoleScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<AstrologerProfile | null>(null);
  const [pending, setPending] = useState<AstrologerConsultation[]>([]);
  const [active, setActive] = useState<AstrologerConsultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, all] = await Promise.all([
        astrologerDashboard.getProfile(),
        astrologerDashboard.listConsultations({ status: 'all' }),
      ]);
      setProfile(p);
      setPending(all.filter((c) => c.status === 'pending'));
      setActive(all.find((c) => c.status === 'active') || null);
    } catch (e) {
      Logger.error('Failed to load console data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAccept = async (id: string) => {
    setActionInProgress(id);
    const result = await astrologerDashboard.acceptConsultation(id);
    setActionInProgress(null);
    if (result.success) {
      await load();
    } else {
      Alert.alert('Error', result.error || 'Failed to accept');
    }
  };

  const handleDecline = async (id: string) => {
    Alert.alert(
      'Decline consultation?',
      'The user will be notified and refunded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline', style: 'destructive',
          onPress: async () => {
            setActionInProgress(id);
            const result = await astrologerDashboard.declineConsultation(id, 'Astrologer unavailable');
            setActionInProgress(null);
            if (result.success) await load();
          },
        },
      ]
    );
  };

  const handleEndActive = async () => {
    if (!active) return;
    Alert.alert(
      'End consultation?',
      'This will stop the billing timer and generate the earnings record.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End', style: 'destructive',
          onPress: async () => {
            const result = await astrologerDashboard.completeConsultation(active.id, active.durationMinutes);
            if (result.success) {
              Alert.alert('Consultation completed', 'Earnings have been added to your pending balance.');
              await load();
            }
          },
        },
      ]
    );
  };

  const handleToggleOnline = async (value: boolean) => {
    if (!profile) return;
    const result = await astrologerDashboard.setOnlineStatus(value);
    if (result.success) {
      setProfile({ ...profile, isOnline: value });
    } else {
      Alert.alert('Error', result.error || 'Failed to update status');
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (loading || !profile) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B46C1" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER with online toggle */}
        <LinearGradient colors={['#6B46C1', '#9F7AEA']} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>🙏 {profile.name}</Text>
              <Text style={styles.subtitle}>{profile.experienceYears}+ years experience</Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: profile.isOnline ? '#22C55E' : '#94A3B8' }]} />
              <Text style={styles.statusText}>{profile.isOnline ? 'Online' : 'Offline'}</Text>
            </View>
          </View>

          <View style={styles.onlineToggle}>
            <View>
              <Text style={styles.toggleLabel}>Accepting consultations</Text>
              <Text style={styles.toggleHint}>
                {profile.isOnline ? 'Users can request you now' : 'Hidden from new requests'}
              </Text>
            </View>
            <Switch
              value={profile.isOnline}
              onValueChange={handleToggleOnline}
              trackColor={{ false: '#FFFFFF40', true: '#22C55E' }}
              thumbColor="#FFFFFF"
              {...createButtonA11yProps(
                profile.isOnline ? 'Go offline' : 'Go online',
                profile.isOnline ? 'Stop accepting consultations' : 'Start accepting consultations',
                false
              )}
            />
          </View>
        </LinearGradient>

        {/* TODAY'S EARNINGS */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <Wallet size={20} color="#6B46C1" />
            <Text style={styles.earningsLabel}>Today&apos;s Earnings</Text>
          </View>
          <Text style={styles.earningsAmount}>{formatINR(profile.stats.todayEarnings)}</Text>
          <View style={styles.earningsRow}>
            <View style={styles.earningsItem}>
              <Text style={styles.earningsItemLabel}>This Week</Text>
              <Text style={styles.earningsItemValue}>{formatINR(profile.stats.thisWeekEarnings)}</Text>
            </View>
            <View style={styles.earningsItem}>
              <Text style={styles.earningsItemLabel}>This Month</Text>
              <Text style={styles.earningsItemValue}>{formatINR(profile.stats.thisMonthEarnings)}</Text>
            </View>
            <View style={styles.earningsItem}>
              <Text style={styles.earningsItemLabel}>All-Time</Text>
              <Text style={styles.earningsItemValue}>{formatINR(profile.stats.totalEarnings)}</Text>
            </View>
          </View>
        </View>

        {/* ACTIVE CONSULTATION (if any) */}
        {active && (
          <View style={[styles.section, styles.activeCard]}>
            <View style={styles.activeHeader}>
              <View style={styles.pulsingDot} />
              <Text style={styles.activeTitle}>Active Consultation</Text>
            </View>
            <ConsultationItem consultation={active} />
            <View style={styles.activeActions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnDanger]}
                onPress={handleEndActive}
                {...createButtonA11yProps('End consultation', 'Stop the billing timer and complete this consultation', false)}
              >
                <PhoneOff size={18} color="#FFF" />
                <Text style={styles.btnText}>End Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* PENDING REQUESTS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Pending Requests {pending.length > 0 && `(${pending.length})`}
            </Text>
          </View>
          {pending.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckCircle size={32} color="#22C55E" />
              <Text style={styles.emptyStateText}>No pending requests</Text>
              <Text style={styles.emptyStateHint}>
                When users request you, they&apos;ll appear here for you to accept.
              </Text>
            </View>
          ) : (
            pending.map((c) => (
              <View key={c.id} style={styles.pendingItem}>
                <ConsultationItem consultation={c} />
                <View style={styles.pendingActions}>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnSecondary]}
                    onPress={() => handleDecline(c.id)}
                    disabled={actionInProgress === c.id}
                    {...createButtonA11yProps('Decline', 'Decline this consultation request', false)}
                  >
                    {actionInProgress === c.id ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <>
                        <X size={18} color="#EF4444" />
                        <Text style={[styles.btnText, { color: '#EF4444' }]}>Decline</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnPrimary, { flex: 1 }]}
                    onPress={() => handleAccept(c.id)}
                    disabled={actionInProgress === c.id}
                    {...createButtonA11yProps('Accept', 'Accept this consultation request', false)}
                  >
                    {actionInProgress === c.id ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <CheckCircle size={18} color="#FFF" />
                        <Text style={styles.btnText}>Accept</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* QUICK STATS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Month</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Users size={20} color="#6B46C1" />
              <Text style={styles.statValue}>{profile.stats.thisMonthConsultations}</Text>
              <Text style={styles.statLabel}>Consultations</Text>
            </View>
            <View style={styles.statBox}>
              <Star size={20} color="#FFD700" fill="#FFD700" />
              <Text style={styles.statValue}>{profile.stats.averageRating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statBox}>
              <Clock size={20} color="#10B981" />
              <Text style={styles.statValue}>{profile.stats.responseTimeMinutes}m</Text>
              <Text style={styles.statLabel}>Avg Response</Text>
            </View>
            <View style={styles.statBox}>
              <TrendingUp size={20} color="#F59E0B" />
              <Text style={styles.statValue}>{Math.round(profile.stats.completionRate * 100)}%</Text>
              <Text style={styles.statLabel}>Completion</Text>
            </View>
          </View>
        </View>

        {/* QUICK NAV */}
        <View style={styles.quickNav}>
          <TouchableOpacity
            style={styles.quickNavItem}
            onPress={() => router.push('/astrologer/consultations')}
            {...createButtonA11yProps('View all consultations', 'See full history of consultations', false)}
          >
            <MessageCircle size={20} color="#6B46C1" />
            <Text style={styles.quickNavText}>All Consultations</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickNavItem}
            onPress={() => router.push('/astrologer/earnings')}
            {...createButtonA11yProps('View earnings', 'See earnings and request payout', false)}
          >
            <Wallet size={20} color="#6B46C1" />
            <Text style={styles.quickNavText}>Earnings</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.quickNav, { marginTop: 10 }]}>
          <TouchableOpacity
            style={styles.quickNavItem}
            onPress={() => router.push('/astrologer/schedule')}
            {...createButtonA11yProps('Edit schedule', 'Manage weekly availability', false)}
          >
            <Calendar size={20} color="#6B46C1" />
            <Text style={styles.quickNavText}>Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickNavItem}
            onPress={() => router.push('/astrologer/reviews')}
            {...createButtonA11yProps('View reviews', 'See all client reviews', false)}
          >
            <Star size={20} color="#6B46C1" />
            <Text style={styles.quickNavText}>Reviews</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.quickNav, { marginTop: 10 }]}>
          <TouchableOpacity
            style={[styles.quickNavItem, { flex: 1 }]}
            onPress={() => router.push('/astrologer/profile')}
            {...createButtonA11yProps('Edit profile', 'Update bio and pricing', false)}
          >
            <User size={20} color="#6B46C1" />
            <Text style={styles.quickNavText}>Edit Profile</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ConsultationItem({ consultation }: { consultation: AstrologerConsultation }) {
  const Icon = consultationTypeIcon(consultation.type);
  return (
    <View style={styles.consultationItem}>
      <View style={styles.consultationAvatar}>
        <Icon size={20} color="#6B46C1" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.consultationName}>{consultation.userName}</Text>
        <Text style={styles.consultationType}>
          {consultation.type.charAt(0).toUpperCase() + consultation.type.slice(1)} consultation • {INCOME_SYMBOL}{consultation.pricePerMinute}/min
        </Text>
        {consultation.userQuestion && (
          <Text style={styles.consultationQuestion} numberOfLines={2}>
            &quot;{consultation.userQuestion}&quot;
          </Text>
        )}
        {consultation.status === 'active' && (
          <Text style={styles.consultationTimer}>
            Active for {consultation.durationMinutes} min • Earned {INCOME_SYMBOL}{consultation.totalAmount}
          </Text>
        )}
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F4FF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F4FF' },
  content: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  greeting: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  onlineToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.1)', padding: 14, borderRadius: 14 },
  toggleLabel: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  toggleHint: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },

  earningsCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: -8, marginBottom: 8, padding: 18, borderRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  earningsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  earningsLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  earningsAmount: { fontSize: 32, fontWeight: '800', color: '#111827', marginBottom: 12 },
  earningsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  earningsItem: { flex: 1 },
  earningsItemLabel: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
  earningsItemValue: { fontSize: 14, fontWeight: '700', color: '#374151' },

  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },

  activeCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, borderWidth: 2, borderColor: '#22C55E' },
  activeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  pulsingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E' },
  activeTitle: { fontSize: 14, fontWeight: '800', color: '#22C55E' },
  activeActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, gap: 6 },
  btnPrimary: { backgroundColor: '#6B46C1' },
  btnSecondary: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EF4444' },
  btnDanger: { backgroundColor: '#EF4444' },
  btnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  emptyState: { alignItems: 'center', padding: 30, backgroundColor: '#FFF', borderRadius: 16 },
  emptyStateText: { fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 12 },
  emptyStateHint: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 6, lineHeight: 18 },

  pendingItem: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  pendingActions: { flexDirection: 'row', gap: 8, marginTop: 12 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: { flex: 1, minWidth: '45%', backgroundColor: '#FFF', padding: 14, borderRadius: 14, alignItems: 'flex-start' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  quickNav: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 20 },
  quickNavItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', padding: 14, borderRadius: 12, justifyContent: 'center' },
  quickNavText: { fontSize: 14, fontWeight: '700', color: '#6B46C1' },

  consultationItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  consultationAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center' },
  consultationName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  consultationType: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  consultationQuestion: { fontSize: 13, color: '#374151', fontStyle: 'italic', marginTop: 6, lineHeight: 18 },
  consultationTimer: { fontSize: 12, color: '#22C55E', fontWeight: '600', marginTop: 6 },
});
