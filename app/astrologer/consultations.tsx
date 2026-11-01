import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft, MessageCircle, Phone, Video, Star,
  Clock, CheckCircle, AlertCircle, CircleDot,
} from 'lucide-react-native';
import { astrologerDashboard } from '@/services/astrologer-dashboard';
import { Logger } from '@/services/logger';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { AstrologerConsultation, ConsultationStatus } from '@/types/astrologer-dashboard';

const STATUS_FILTERS: { key: ConsultationStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  accepted: '#3B82F6',
  active: '#22C55E',
  completed: '#6B46C1',
  cancelled: '#EF4444',
  declined: '#94A3B8',
  no_show: '#64748B',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function typeIcon(type: string) {
  switch (type) {
    case 'chat': return MessageCircle;
    case 'voice': return Phone;
    case 'video': return Video;
    default: return MessageCircle;
  }
}

export default function AstrologerConsultationsScreen() {
  const [filter, setFilter] = useState<ConsultationStatus | 'all'>('all');
  const [consultations, setConsultations] = useState<AstrologerConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await astrologerDashboard.listConsultations({ status: filter, limit: 100 });
      setConsultations(data);
    } catch (e) {
      Logger.error('Failed to load consultations', e);
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

  const [currentAstrologerId, setCurrentAstrologerId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // In dev/mock mode, pretend we're the mocked astrologer
      setCurrentAstrologerId('astrologer_1');
      return;
    }
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentAstrologerId(user?.id ?? null);
      } catch (e) {
        Logger.error('Failed to load current astrologer id', e);
        setCurrentAstrologerId(null);
      }
    })();
  }, []);

  const handleEndActive = async (c: AstrologerConsultation) => {
    Alert.alert(
      'End consultation?',
      'This will stop the billing timer and mark it as completed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End', style: 'destructive',
          onPress: async () => {
            const result = await astrologerDashboard.completeConsultation(c.id, c.durationMinutes);
            if (result.success) {
              Alert.alert('Completed', 'Earnings have been recorded.');
              load();
            } else {
              Alert.alert('Error', result.error || 'Failed to complete');
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
        <Text style={styles.headerTitle}>Consultations</Text>
        <View style={styles.emptyNav} />
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
        {STATUS_FILTERS.map((f) => (
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

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6B46C1" />
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
        >
          {consultations.length === 0 ? (
            <View style={styles.emptyState}>
              <AlertCircle size={40} color="#94A3B8" />
              <Text style={styles.emptyText}>No consultations found</Text>
            </View>
          ) : (
            consultations.map((c) => (
              <ConsultationCard
                key={c.id}
                consultation={c}
                currentAstrologerId={currentAstrologerId}
                onEndActive={() => handleEndActive(c)}
              />
            ))
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ConsultationCard({
  consultation: c,
  currentAstrologerId,
  onEndActive,
}: {
  consultation: AstrologerConsultation;
  currentAstrologerId: string | null;
  onEndActive: () => void;
}) {
  const Icon = typeIcon(c.type);
  const statusColor = STATUS_COLORS[c.status] || '#94A3B8';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.typeIconWrap, { backgroundColor: statusColor + '15' }]}>
            <Icon size={18} color={statusColor} />
          </View>
          <View>
            <Text style={styles.userName}>{c.userName}</Text>
            <Text style={styles.metaText}>
              {c.type.charAt(0).toUpperCase() + c.type.slice(1)} • {formatDate(c.createdAt)}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
          <CircleDot size={10} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
          </Text>
        </View>
      </View>

      {c.userQuestion ? (
        <Text style={styles.question} numberOfLines={2}>“{c.userQuestion}”</Text>
      ) : null}

      <View style={styles.cardFooter}>
        {c.durationMinutes > 0 && (
          <View style={styles.footerItem}>
            <Clock size={14} color="#6B7280" />
            <Text style={styles.footerText}>{c.durationMinutes} min</Text>
          </View>
        )}
        {c.totalAmount > 0 && (
          <View style={styles.footerItem}>
            <Text style={styles.footerText}>₹{c.totalAmount}</Text>
          </View>
        )}
        {c.rating ? (
          <View style={styles.footerItem}>
            <Star size={14} color="#FFD700" fill="#FFD700" />
            <Text style={styles.footerText}>{c.rating}</Text>
          </View>
        ) : null}
      </View>

      {c.status === 'active' && (currentAstrologerId === null || (c as { astrologerId?: string }).astrologerId === undefined || (c as { astrologerId?: string }).astrologerId === currentAstrologerId) && (
        <TouchableOpacity style={styles.endBtn} onPress={onEndActive}>
          <CheckCircle size={16} color="#FFF" />
          <Text style={styles.endBtnText}>End Consultation</Text>
        </TouchableOpacity>
      )}
      {/* Defensive: show a small banner if a consultation snuck through
          that doesn't belong to the current astrologer (shouldn't happen
          with RLS, but if it does we hide actions). */}
      {c.status === 'active' && currentAstrologerId !== null && (c as { astrologerId?: string }).astrologerId !== undefined && (c as { astrologerId?: string }).astrologerId !== currentAstrologerId && (
        <View style={styles.readOnlyBanner}>
          <AlertCircle size={14} color="#F59E0B" />
          <Text style={styles.readOnlyText}>Read-only — assigned to another astrologer</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F4FF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E5EA',
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptyNav: { width: 40 },
  filterBar: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E5EA' },
  filterChipActive: { backgroundColor: '#6B46C1', borderColor: '#6B46C1' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  filterChipTextActive: { color: '#FFF' },
  listContent: { padding: 12, gap: 10 },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#6B7280', marginTop: 12 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E5E5EA' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  typeIconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  metaText: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
  question: { fontSize: 13, color: '#374151', fontStyle: 'italic', marginTop: 10, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  endBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#22C55E', paddingVertical: 10, borderRadius: 12, marginTop: 12 },
  endBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  readOnlyBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginTop: 12 },
  readOnlyText: { fontSize: 12, color: '#92400E', fontWeight: '600' },
});
