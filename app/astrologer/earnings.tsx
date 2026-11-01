import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft, Wallet, TrendingUp, Clock,
  AlertCircle, DollarSign,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { astrologerDashboard } from '@/services/astrologer-dashboard';
import { Logger } from '@/services/logger';
import type { AstrologerEarning } from '@/types/astrologer-dashboard';

const EARNINGS_FILTERS = [
  { key: 'all' as const, label: 'All' },
  { key: 'pending' as const, label: 'Pending' },
  { key: 'processing' as const, label: 'Processing' },
  { key: 'paid' as const, label: 'Paid' },
];

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AstrologerEarningsScreen() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'processing'>('all');
  const [earnings, setEarnings] = useState<AstrologerEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await astrologerDashboard.listEarnings({ status: filter });
      setEarnings(data);
    } catch (e) {
      Logger.error('Failed to load earnings', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const totals = useMemo(() => {
    const pending = earnings.filter((e) => e.status === 'pending').reduce((s, e) => s + e.netAmount, 0);
    const paid = earnings.filter((e) => e.status === 'paid').reduce((s, e) => s + e.netAmount, 0);
    const processing = earnings.filter((e) => e.status === 'processing').reduce((s, e) => s + e.netAmount, 0);
    return { pending, paid, processing, total: pending + paid + processing };
  }, [earnings]);

  const handlePayout = async () => {
    if (totals.pending <= 0) {
      Alert.alert('No pending earnings', 'You have no unpaid earnings to withdraw.');
      return;
    }
    Alert.alert(
      'Request payout?',
      `You are about to request a payout of ${formatINR(totals.pending)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request', style: 'default',
          onPress: async () => {
            setPayoutLoading(true);
            const result = await astrologerDashboard.requestPayout();
            setPayoutLoading(false);
            if (result.success) {
              Alert.alert('Payout requested', 'Your request has been submitted and will be processed within 7 business days.');
              load();
            } else {
              Alert.alert('Error', result.error || 'Failed to request payout');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings</Text>
        <View style={styles.emptyNav} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        {/* Summary Cards */}
        <LinearGradient colors={['#6B46C1', '#9F7AEA']} style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Pending Payout</Text>
          <Text style={styles.summaryValue}>{formatINR(totals.pending)}</Text>
          <Text style={styles.summarySub}>Available to withdraw now</Text>
        </LinearGradient>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <TrendingUp size={18} color="#6B46C1" />
            <Text style={styles.statValue}>{formatINR(totals.total)}</Text>
            <Text style={styles.statLabel}>Lifetime Earnings</Text>
          </View>
          <View style={styles.statBox}>
            <DollarSign size={18} color="#22C55E" />
            <Text style={styles.statValue}>{formatINR(totals.paid)}</Text>
            <Text style={styles.statLabel}>Paid Out</Text>
          </View>
          <View style={styles.statBox}>
            <Clock size={18} color="#F59E0B" />
            <Text style={styles.statValue}>{formatINR(totals.processing)}</Text>
            <Text style={styles.statLabel}>Processing</Text>
          </View>
        </View>

        {/* Payout CTA */}
        <TouchableOpacity
          style={[styles.payoutBtn, totals.pending <= 0 && styles.payoutBtnDisabled]}
          onPress={handlePayout}
          disabled={payoutLoading || totals.pending <= 0}
        >
          {payoutLoading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Wallet size={18} color="#FFF" />
              <Text style={styles.payoutBtnText}>Request Payout</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
          {EARNINGS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Earnings List */}
        {loading ? (
          <ActivityIndicator size="large" color="#6B46C1" style={{ marginTop: 24 }} />
        ) : earnings.length === 0 ? (
          <View style={styles.emptyState}>
            <AlertCircle size={40} color="#94A3B8" />
            <Text style={styles.emptyText}>No earnings found</Text>
          </View>
        ) : (
          earnings.map((e) => (
            <View key={e.id} style={styles.earningCard}>
              <View style={styles.earningRow}>
                <View>
                  <Text style={styles.earningUser}>{e.userName}</Text>
                  <Text style={styles.earningDate}>{formatDate(e.createdAt)}</Text>
                </View>
                <Text style={styles.earningNet}>+{formatINR(e.netAmount)}</Text>
              </View>
              <View style={styles.earningMeta}>
                <Text style={styles.earningMetaText}>Gross: {formatINR(e.grossAmount)}</Text>
                <Text style={styles.earningMetaText}>Fee: {formatINR(e.platformFee)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: (e.status === 'paid' ? '#22C55E' : e.status === 'processing' ? '#F59E0B' : '#6B46C1') + '15' }]}>
                  <Text style={[styles.statusText, { color: e.status === 'paid' ? '#22C55E' : e.status === 'processing' ? '#F59E0B' : '#6B46C1' }]}>
                    {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F4FF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E5EA',
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptyNav: { width: 40 },
  content: { padding: 16, paddingBottom: 40 },
  summaryCard: { borderRadius: 20, padding: 22, marginBottom: 16 },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  summaryValue: { fontSize: 34, fontWeight: '800', color: '#FFF', marginTop: 4 },
  summarySub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA' },
  statValue: { fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 8 },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  payoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#22C55E', paddingVertical: 14, borderRadius: 14, marginBottom: 16 },
  payoutBtnDisabled: { backgroundColor: '#94A3B8' },
  payoutBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  filterBar: { gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E5EA' },
  filterChipActive: { backgroundColor: '#6B46C1', borderColor: '#6B46C1' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  filterChipTextActive: { color: '#FFF' },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#6B7280', marginTop: 12 },
  earningCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E5EA' },
  earningRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  earningUser: { fontSize: 15, fontWeight: '700', color: '#111827' },
  earningDate: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  earningNet: { fontSize: 16, fontWeight: '800', color: '#22C55E' },
  earningMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  earningMetaText: { fontSize: 11, color: '#9CA3AF' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
});
