/**
 * Admin dashboard — driven by real Supabase aggregation RPCs.
 *
 * Every card, timeseries, activity row, and top-astrologer number comes
 * from `services/admin-analytics.ts`, which wraps the admin_* functions
 * added in migration 007. The existing monitoring service is still used
 * for the on-device health panel (API latency, error rate, etc.).
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  Activity,
  BarChart3,
  DollarSign,
  Settings,
  Shield,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import { AppTheme, useAppTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMonitoringDashboard, type Alert } from '@/services/monitoring-dashboard';
import { useAdvancedAnalytics } from '@/services/advanced-analytics';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';
import MetricCard from '@/components/admin/MetricCard';
import AlertCard from '@/components/admin/AlertCard';
import ActionCard from '@/components/admin/ActionCard';
import ActivityList from '@/components/admin/ActivityList';
import { logAdminAction, UserRole } from '@/utils/rbac';
import { Logger } from '@/services/logger';
import { supabase } from '@/lib/supabase';
import {
  formatInr,
  formatPercentDelta,
  type AdminActivity,
} from '@/services/admin-analytics';
import {
  useAdminOverview,
  useRecentActivity,
  useRevenueTimeseries,
  useTopAstrologers,
} from '@/hooks/queries/useAdminAnalytics';
import { relativeTime } from '@/services/cms';

type DashboardMetric = {
  id: string;
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
};

interface AdminAlert {
  id: string;
  message: string;
  timestamp: Date | string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
  resolved: boolean;
  metadata?: Record<string, unknown>;
}

const ACTION_LABELS: Record<string, string> = {
  signup: 'New sign-up',
  consultation_booked: 'Consultation booked',
  consultation_completed: 'Consultation completed',
  order_placed: 'Order placed',
};

function activityAction(a: AdminActivity): string {
  return ACTION_LABELS[a.action] ?? a.action;
}

export default function AdminDashboard() {
  const Colors = useAppTheme();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { isAuthenticated, user, isHydrating } = useAuth();
  const { getAlerts, resolveAlert } = useMonitoringDashboard();
  const { t } = useLanguage();
  useAdvancedAnalytics();

  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // Real admin data from Supabase — gated so non-admins never run the RPCs.
  // NOTE: this client flag only gates *fetching* (enabled flags below). The
  // route itself is protected by <ProtectedAdminRoute>, which checks the
  // server-side is_admin() RPC; role strings here must use 'super_admin'
  // (with underscore, matching utils/rbac.ts UserRole) — the old
  // 'superadmin' spelling never matched and bounced legit super-admins.
  const overviewQuery = useAdminOverview(isAdmin);
  const timeseriesQuery = useRevenueTimeseries(14, isAdmin);
  const activityQuery = useRecentActivity(15, isAdmin);
  const topAstrologersQuery = useTopAstrologers(5, isAdmin);

  const userRole = UserRole.ADMIN;

  useFocusEffect(
    useCallback(() => {
      if (isHydrating) return;
      if (!isAuthenticated) {
        router.replace('/onboarding');
      } else if (!isAdmin) {
        Logger.warn('Non-admin attempted to open admin dashboard', { userId: user?.id });
        router.replace('/');
      }
    }, [isHydrating, isAuthenticated, isAdmin, user?.id]),
  );

  // Build metric cards from the real overview payload
  const metrics = useMemo<DashboardMetric[]>(() => {
    const o = overviewQuery.data;
    if (!o) return [];

    const usersDelta = formatPercentDelta(o.newUsers7d, o.newUsersPrev7d);
    const revenueDelta = formatPercentDelta(o.revenue7dInr, o.revenuePrev7dInr);
    const consultationsDelta = formatPercentDelta(o.consultations7d, o.consultationsPrev7d);

    const changeType = (dir: 'up' | 'down' | 'flat'): DashboardMetric['changeType'] =>
      dir === 'up' ? 'positive' : dir === 'down' ? 'negative' : 'neutral';

    return [
      {
        id: 'users',
        title: t('admin.metrics.activeUsers'),
        value: o.activeUsers.toLocaleString('en-IN'),
        change: `${usersDelta.label} new last 7d`,
        changeType: changeType(usersDelta.direction),
        icon: <Users size={24} color={Colors.primary} />,
      },
      {
        id: 'revenue',
        title: t('admin.metrics.revenue'),
        value: formatInr(o.grossRevenueInr),
        change: `${revenueDelta.label} week on week`,
        changeType: changeType(revenueDelta.direction),
        icon: <DollarSign size={24} color={Colors.success} />,
      },
      {
        id: 'consultations',
        title: 'Consultations',
        value: o.totalConsultations.toLocaleString('en-IN'),
        change: `${consultationsDelta.label} last 7d`,
        changeType: changeType(consultationsDelta.direction),
        icon: <Activity size={24} color={Colors.purple} />,
      },
      {
        id: 'astrologers',
        title: 'Astrologers',
        value: `${o.activeAstrologers}/${o.totalAstrologers}`,
        change: `${o.activeAstrologers} available now`,
        changeType: 'neutral',
        icon: <TrendingUp size={24} color={Colors.gold} />,
      },
    ];
  }, [overviewQuery.data, Colors, t]);

  // Alerts still come from the client-side monitoring service
  const alerts = useMemo<AdminAlert[]>(() => {
    try {
      const list = getAlerts() ?? [];
      return list.map((alert: Alert) => ({
        id: alert.id,
        message: alert.message,
        timestamp: alert.timestamp,
        severity: alert.severity,
        acknowledged: false,
        resolved: alert.resolved,
        metadata: alert.metadata,
      }));
    } catch {
      return [];
    }
  }, [getAlerts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      overviewQuery.refetch(),
      timeseriesQuery.refetch(),
      activityQuery.refetch(),
      topAstrologersQuery.refetch(),
    ]);
    setRefreshing(false);
  }, [overviewQuery, timeseriesQuery, activityQuery, topAstrologersQuery]);

  const handleResolveAlert = useCallback(
    async (alertId: string) => {
      // Server-side audit is authoritative (log_audit RPC, migration 012).
      // logAdminAction is a dev-only local no-op — resolving an alert must
      // leave a row in audit_logs even in production builds.
      const serverAudit = async (success: boolean, error?: unknown) => {
        try {
          await supabase.rpc('log_audit', {
            p_action: 'RESOLVE_ALERT',
            p_resource: 'alert',
            p_success: success,
            p_details: error
              ? { alertId, error: String(error) }
              : { alertId },
          });
        } catch (auditError) {
          Logger.error('Server audit write failed', auditError);
        }
      };
      try {
        await resolveAlert(alertId);
        await serverAudit(true);
        if (user) {
          logAdminAction({
            userId: user.id,
            userName: user.name || user.email || 'Unknown',
            userRole,
            action: 'RESOLVE_ALERT',
            resource: 'alert',
            success: true,
            details: { alertId },
          });
        }
        await onRefresh();
      } catch (error) {
        Logger.error('Error resolving alert:', error);
        await serverAudit(false, error);
        if (user) {
          logAdminAction({
            userId: user.id,
            userName: user.name || user.email || 'Unknown',
            userRole,
            action: 'RESOLVE_ALERT',
            resource: 'alert',
            success: false,
            details: { alertId, error: String(error) },
          });
        }
      }
    },
    [resolveAlert, onRefresh, user, userRole],
  );

  const dashboardSections = useMemo(
    () => [
      { id: 'users', title: 'User Management', icon: Users, route: '/admin/users' },
      { id: 'analytics', title: 'Analytics', icon: BarChart3, route: '/admin/analytics' },
      { id: 'payments', title: 'Payments', icon: DollarSign, route: '/admin/payments' },
      { id: 'security', title: 'Security', icon: Shield, route: '/admin/security' },
      { id: 'settings', title: 'Settings', icon: Settings, route: '/admin/settings' },
    ],
    [],
  );

  const recentActivities = useMemo(
    () =>
      (activityQuery.data ?? []).map(a => ({
        time: relativeTime(a.activityAt),
        action: activityAction(a) + (a.detail ? ` · ${a.detail}` : ''),
        user: a.actorName,
      })),
    [activityQuery.data],
  );

  const isLoading =
    overviewQuery.isLoading && !overviewQuery.data
      ? true
      : timeseriesQuery.isLoading && !timeseriesQuery.data;

  if (!isAuthenticated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }

  return (
    <FeatureErrorBoundary featureName="Admin Dashboard">
      <ProtectedAdminRoute>
        <SafeAreaView style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{t('admin.dashboard')}</Text>
              <Text style={styles.headerSubtitle}>{t('admin.management')}</Text>
            </View>

            {/* Overview metrics */}
            {isLoading && metrics.length === 0 ? (
              <View style={styles.centeredPanel}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.loadingText}>Loading live metrics…</Text>
              </View>
            ) : overviewQuery.data ? (
              <View style={styles.metricsGrid}>
                {metrics.map(metric => (
                  <MetricCard key={metric.id} metric={metric} />
                ))}
              </View>
            ) : (
              <View style={styles.centeredPanel}>
                <Text style={styles.stateTitle}>Can&apos;t reach analytics</Text>
                <Text style={styles.stateText}>
                  Check that migration 007 is applied and you&apos;re signed in as an admin.
                </Text>
              </View>
            )}

            {/* Revenue sparkline */}
            {overviewQuery.data && timeseriesQuery.data && timeseriesQuery.data.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Revenue (last 14 days)</Text>
                <RevenueBars
                  points={timeseriesQuery.data}
                  accent={Colors.success}
                  muted={Colors.border}
                  text={Colors.text}
                  textLight={Colors.textLight}
                />
                <View style={styles.revenueSummary}>
                  <View>
                    <Text style={styles.revenueSummaryLabel}>This week</Text>
                    <Text style={styles.revenueSummaryValue}>
                      {formatInr(overviewQuery.data.revenue7dInr)}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.revenueSummaryLabel}>Prior week</Text>
                    <Text style={styles.revenueSummaryValue}>
                      {formatInr(overviewQuery.data.revenuePrev7dInr)}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.revenueSummaryLabel}>Open disputes</Text>
                    <Text style={styles.revenueSummaryValue}>
                      {overviewQuery.data.activeDisputes}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Top astrologers */}
            {topAstrologersQuery.data && topAstrologersQuery.data.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top astrologers (30-day revenue)</Text>
                <View style={styles.leaderboard}>
                  {topAstrologersQuery.data.map((row, i) => (
                    <View key={row.astrologerId} style={styles.leaderRow}>
                      <Text style={styles.leaderRank}>#{i + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.leaderName}>{row.name}</Text>
                        <Text style={styles.leaderMeta}>
                          {row.consultations} consultations · {formatInr(row.revenueInr)}
                        </Text>
                      </View>
                      <View style={styles.leaderRating}>
                        <Star size={12} color="#FFB300" fill="#FFB300" />
                        <Text style={styles.leaderRatingText}>{row.rating.toFixed(1)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Alerts */}
            {alerts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('admin.alerts.active')}</Text>
                {alerts.slice(0, 5).map(alert => (
                  <AlertCard key={alert.id} alert={alert} onResolve={handleResolveAlert} />
                ))}
              </View>
            )}

            {/* Quick actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('admin.actions.quickActions')}</Text>
              <View style={styles.actionsGrid}>
                {dashboardSections.map(section => {
                  const titleKey =
                    section.id === 'users'
                      ? 'userManagement'
                      : section.id === 'analytics'
                      ? 'analytics'
                      : section.id === 'payments'
                      ? 'payments'
                      : section.id === 'security'
                      ? 'security'
                      : section.id === 'settings'
                      ? 'settings'
                      : section.id;
                  return (
                    <ActionCard
                      key={section.id}
                      icon={<section.icon size={32} color={Colors.primary} />}
                      title={t(`admin.actions.${titleKey}`)}
                      onPress={() => router.push(section.route)}
                    />
                  );
                })}
              </View>
            </View>

            {/* Recent Activity */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('admin.activity.title')}</Text>
              {activityQuery.isLoading && recentActivities.length === 0 ? (
                <View style={styles.centeredPanel}>
                  <ActivityIndicator color={Colors.primary} />
                </View>
              ) : recentActivities.length === 0 ? (
                <View style={styles.centeredPanel}>
                  <Text style={styles.stateText}>No recent activity yet.</Text>
                </View>
              ) : (
                <ActivityList activities={recentActivities} />
              )}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </ProtectedAdminRoute>
    </FeatureErrorBoundary>
  );
}

// ─── Tiny sparkline (native only, no chart library) ─────────────────────────

function RevenueBars({
  points,
  accent,
  muted,
  text,
  textLight,
}: {
  points: { day: string; revenueInr: number; consultations: number }[];
  accent: string;
  muted: string;
  text: string;
  textLight: string;
}) {
  const max = Math.max(1, ...points.map(p => p.revenueInr));
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 90,
        gap: 4,
        padding: 10,
        backgroundColor: '#FFF',
        borderRadius: 12,
      }}
    >
      {points.map(p => {
        const heightPct = Math.max(6, Math.round((p.revenueInr / max) * 100));
        const day = new Date(p.day).getDate();
        return (
          <View key={p.day} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <View
              style={{
                width: '100%',
                height: `${heightPct}%`,
                backgroundColor: p.revenueInr > 0 ? accent : muted,
                borderRadius: 3,
              }}
            />
            <Text style={{ fontSize: 9, color: p.revenueInr > 0 ? text : textLight }}>{day}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const createStyles = (Colors: AppTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scrollView: { flex: 1 },
    header: { padding: 20, backgroundColor: Colors.primary },
    headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.white },
    headerSubtitle: {
      fontSize: 14,
      color: Colors.white,
      opacity: 0.9,
      marginTop: 4,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 16,
      gap: 12,
    },
    section: { padding: 20 },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: Colors.text,
      marginBottom: 16,
    },
    actionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    revenueSummary: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 12,
      marginTop: 10,
      backgroundColor: Colors.white,
      borderRadius: 12,
    },
    revenueSummaryLabel: { fontSize: 11, color: Colors.textLight, fontWeight: '600' },
    revenueSummaryValue: {
      fontSize: 16,
      fontWeight: '800',
      color: Colors.text,
      marginTop: 2,
    },
    leaderboard: {
      backgroundColor: Colors.white,
      borderRadius: 12,
      padding: 10,
      gap: 4,
    },
    leaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    leaderRank: {
      width: 28,
      fontSize: 14,
      fontWeight: '800',
      color: Colors.primary,
      textAlign: 'center',
    },
    leaderName: { fontSize: 14, fontWeight: '700', color: Colors.text },
    leaderMeta: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
    leaderRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    leaderRatingText: { fontSize: 12, fontWeight: '600', color: Colors.text },
    centeredPanel: {
      padding: 24,
      alignItems: 'center',
      gap: 8,
    },
    stateTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
    stateText: { fontSize: 12, color: Colors.textLight, textAlign: 'center' },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: Colors.background,
    },
    loadingText: {
      marginTop: 8,
      fontSize: 12,
      color: Colors.textLight,
    },
  });
