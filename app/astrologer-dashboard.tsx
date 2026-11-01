import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  DollarSign,
  Star,
  Clock,
  Users,
  TrendingUp,
  BarChart3,
  MessageCircle,
  Phone,
  Video,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { AstrologerAnalyticsService, AstrologerDashboard } from '@/services/astrologer-analytics';
import { getMyAstrologerProfile } from '@/services/chat';
import { useAuth } from '@/contexts/AuthContext';
import { Logger } from '@/services/logger';

export default function AstrologerDashboardScreen() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<AstrologerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'ratings'>('overview');
  // Resolve the astrologer record from the signed-in user instead of a
  // hardcoded placeholder id (which made every real astrologer see ₹0).
  // `undefined` = still resolving (keep the loading state), `null` = signed-in
  // user is not an astrologer.
  const [astrologerId, setAstrologerId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setAstrologerId(null);
      return;
    }
    getMyAstrologerProfile(user.id)
      .then((profile) => {
        if (!cancelled) setAstrologerId(profile?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setAstrologerId(null);
      });
    return () => { cancelled = true; };
  }, [user]);

  const loadDashboard = useCallback(async () => {
    if (astrologerId === undefined) return; // still resolving — keep loading
    if (astrologerId === null) {
      setDashboard(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await AstrologerAnalyticsService.getDashboard(astrologerId);
      setDashboard(data);
    } catch (err) {
      Logger.error('Failed to load astrologer dashboard', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [astrologerId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!dashboard) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load dashboard</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDashboard}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const earnings = dashboard.earnings;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings Dashboard</Text>
        <View style={styles.emptyNav} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['overview', 'activity', 'ratings'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === 'overview' && (
          <>
            {/* Earnings Cards */}
            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, styles.primaryCard]}>
                <DollarSign size={20} color={Colors.primary} />
                <Text style={styles.metricLabel}>Today&apos;s Earnings</Text>
                <Text style={styles.metricValue}>₹{earnings.today}</Text>
              </View>
              <View style={styles.metricCard}>
                <TrendingUp size={20} color={Colors.success} />
                <Text style={styles.metricLabel}>This Week</Text>
                <Text style={styles.metricValue}>₹{earnings.thisWeek}</Text>
              </View>
              <View style={styles.metricCard}>
                <BarChart3 size={20} color={Colors.purple} />
                <Text style={styles.metricLabel}>This Month</Text>
                <Text style={styles.metricValue}>₹{earnings.thisMonth}</Text>
              </View>
              <View style={styles.metricCard}>
                <DollarSign size={20} color={Colors.gold} />
                <Text style={styles.metricLabel}>Total Earnings</Text>
                <Text style={styles.metricValue}>₹{earnings.total}</Text>
              </View>
            </View>

            {/* Pending Payout */}
            <View style={styles.payoutCard}>
              <Text style={styles.payoutLabel}>Pending Payout</Text>
              <Text style={styles.payoutValue}>₹{earnings.pendingPayout}</Text>
              <Text style={styles.payoutSubtext}>Pending — reviewed by our team before payout</Text>
            </View>

            {/* Key Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Users size={20} color={Colors.primary} />
                <Text style={styles.statValue}>{dashboard.totalConsultations}</Text>
                <Text style={styles.statLabel}>Consultations</Text>
              </View>
              <View style={styles.statItem}>
                <Clock size={20} color={Colors.purple} />
                <Text style={styles.statValue}>{dashboard.avgSessionDuration}m</Text>
                <Text style={styles.statLabel}>Avg Duration</Text>
              </View>
              <View style={styles.statItem}>
                <Star size={20} color={Colors.gold} />
                <Text style={styles.statValue}>
                  {(dashboard.ratingDistribution.reduce((sum, d) => sum + d.rating * d.count, 0) /
                    Math.max(dashboard.ratingDistribution.reduce((sum, d) => sum + d.count, 0), 1)).toFixed(1)}
                </Text>
                <Text style={styles.statLabel}>Avg Rating</Text>
              </View>
            </View>

            {/* Consultation Type Breakdown */}
            <Text style={styles.sectionTitle}>Consultation Types</Text>
            {dashboard.typeBreakdown.map((type) => (
              <View key={type.type} style={styles.typeRow}>
                <View style={styles.typeIcon}>
                  {type.type === 'chat' && <MessageCircle size={16} color={Colors.primary} />}
                  {type.type === 'call' && <Phone size={16} color={Colors.success} />}
                  {type.type === 'video' && <Video size={16} color={Colors.purple} />}
                </View>
                <View style={styles.typeInfo}>
                  <Text style={styles.typeName}>{type.type.charAt(0).toUpperCase() + type.type.slice(1)}</Text>
                  <Text style={styles.typeCount}>{type.count} consultations</Text>
                </View>
                <Text style={styles.typeEarnings}>₹{type.earnings}</Text>
              </View>
            ))}
          </>
        )}

        {activeTab === 'activity' && (
          <>
            <Text style={styles.sectionTitle}>Today&apos;s Activity (Hourly)</Text>
            {dashboard.todayActivity.map((hour) => (
              <View key={hour.hour} style={styles.hourRow}>
                <Text style={styles.hourLabel}>
                  {hour.hour.toString().padStart(2, '0')}:00
                </Text>
                <View style={styles.hourBarContainer}>
                  <View
                    style={[
                      styles.hourBar,
                      {
                        width: `${Math.min((hour.consultations / Math.max(
                          ...dashboard.todayActivity.map((h) => h.consultations),
                          1
                        )) * 100, 100)}%`,
                        backgroundColor: hour.consultations > 0 ? Colors.primary : Colors.border,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.hourValue}>{hour.consultations}</Text>
              </View>
            ))}

            <Text style={styles.sectionTitle}>Peak Hours Recommendation</Text>
            <View style={styles.peakHoursCard}>
              <Text style={styles.peakHoursTitle}>Recommended Online Hours</Text>
              <View style={styles.hoursList}>
                {dashboard.peakHours.recommendedHours.slice(0, 8).map((h) => (
                  <View key={h} style={styles.hourBadge}>
                    <Text style={styles.hourBadgeText}>{h.toString().padStart(2, '0')}:00</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {activeTab === 'ratings' && (
          <>
            <Text style={styles.sectionTitle}>Rating Distribution</Text>
            {dashboard.ratingDistribution
              .slice()
              .reverse()
              .map((item) => (
                <View key={item.rating} style={styles.ratingRow}>
                  <Text style={styles.ratingLabel}>{item.rating} ★</Text>
                  <View style={styles.ratingBarContainer}>
                    <View
                      style={[
                        styles.ratingBar,
                        {
                          width: `${Math.min(
                            (item.count /
                              Math.max(
                                ...dashboard.ratingDistribution.map((d) => d.count),
                                1
                              )) *
                              100,
                            100
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.ratingCount}>{item.count}</Text>
                </View>
              ))}

            <Text style={styles.sectionTitle}>Repeat Customer Rate</Text>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {Math.round(dashboard.repeatCustomerRate * 100)}%
              </Text>
              <Text style={styles.metricLabel}>of your clients return for more consultations</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.textLight,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyNav: { width: 40 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  activeTabText: {
    color: Colors.primary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  primaryCard: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 8,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 4,
  },
  payoutCard: {
    backgroundColor: Colors.successLight,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  payoutLabel: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: '600',
  },
  payoutValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.success,
    marginTop: 4,
  },
  payoutSubtext: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  typeName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  typeCount: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  typeEarnings: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.success,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  hourLabel: {
    width: 50,
    fontSize: 12,
    color: Colors.textLight,
  },
  hourBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  hourBar: {
    height: '100%',
    borderRadius: 4,
  },
  hourValue: {
    width: 24,
    fontSize: 12,
    color: Colors.text,
    textAlign: 'right',
  },
  peakHoursCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  peakHoursTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  hoursList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hourBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  hourBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingLabel: {
    width: 40,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  ratingBarContainer: {
    flex: 1,
    height: 10,
    backgroundColor: Colors.border,
    borderRadius: 5,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  ratingBar: {
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 5,
  },
  ratingCount: {
    width: 30,
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'right',
  },
});
