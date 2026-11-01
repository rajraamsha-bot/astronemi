import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  Video,
  Clock,
  Star,
  ChevronRight,
  Calendar,
  FileText,
} from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useConsultationHistory } from '@/hooks/queries/useConsultationHistory';
import { ConsultationSummary } from '@/types/entities';

// Using ConsultationSummary from types/entities instead of local interface


const typeConfig = {
  chat: { icon: MessageCircle, color: '#4CAF50', label: 'Chat' },
  call: { icon: Phone, color: '#2196F3', label: 'Call' },
  video: { icon: Video, color: '#9C27B0', label: 'Video' },
};

const statusConfig = {
  completed: { color: '#4CAF50', label: 'Completed' },
  upcoming: { color: '#FF9800', label: 'Upcoming' },
  cancelled: { color: '#F44336', label: 'Cancelled' },
};

const getMappedStatus = (status: string) => {
  return status === 'pending' || status === 'active' ? 'upcoming' : status as 'completed' | 'upcoming' | 'cancelled';
};

export default function ConsultationsScreen() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'completed' | 'upcoming' | 'cancelled'>('all');

  // ✅ REFACTORED: Replaced useFocusEffect + fetch with React Query
  const { data: consultations = [], isLoading: loading, isRefetching: refreshing, refetch } = useConsultationHistory(user?.id);

  // Refetch on screen focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const onRefresh = () => {
    refetch();
  };

  const filteredConsultations = consultations.filter(c => {
    if (filter === 'all') return true;
    return getMappedStatus(c.status) === filter;
  });

  const renderConsultation = ({ item }: { item: ConsultationSummary }) => {
    const typeConf = typeConfig[item.type];
    const mappedStatus = getMappedStatus(item.status);
    const statusConf = statusConfig[mappedStatus];
    const TypeIcon = typeConf.icon;

    return (
      <TouchableOpacity
        style={styles.consultationCard}
        onPress={() => {
          if (item.type === 'chat') {
            router.push(`/chat/${item.id}`);
          } else {
            router.push(`/call/${item.id}?type=${item.type === 'video' ? 'video' : 'audio'}`);
          }
        }}
      >
        <Image source={{ uri: item.astrologerAvatar || undefined }} style={styles.astrologerImage} />
        
        <View style={styles.consultationContent}>
          <View style={styles.consultationHeader}>
            <Text style={styles.astrologerName}>{item.astrologerName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusConf.color + '20' }]}>
              <Text style={[styles.statusText, { color: statusConf.color }]}>
                {statusConf.label}
              </Text>
            </View>
          </View>

          <View style={styles.consultationMeta}>
            <View style={styles.typeBadge}>
              <TypeIcon size={14} color={typeConf.color} />
              <Text style={[styles.typeText, { color: typeConf.color }]}>
                {typeConf.label}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Calendar size={12} color={Colors.textLight} />
              <Text style={styles.metaText}>{item.formattedDate}</Text>
            </View>
            <View style={styles.metaItem}>
              <Clock size={12} color={Colors.textLight} />
              <Text style={styles.metaText}>{item.formattedDuration}</Text>
            </View>
          </View>

          {item.user_rating && (
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={12}
                  color={Colors.gold}
                  fill={star <= item.user_rating! ? Colors.gold : 'transparent'}
                />
              ))}
            </View>
          )}

          <View style={styles.consultationFooter}>
            <Text style={styles.amountText}>Rs.{item.total_amount}</Text>
            <ChevronRight size={18} color={Colors.textLight} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Consultation History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'completed', 'upcoming', 'cancelled'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{consultations.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>
            {consultations.filter(c => getMappedStatus(c.status) === 'completed').length}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#FF9800' }]}>
            {consultations.filter(c => getMappedStatus(c.status) === 'upcoming').length}
          </Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F44336' }]}>
            {consultations.filter(c => getMappedStatus(c.status) === 'cancelled').length}
          </Text>
          <Text style={styles.statLabel}>Cancelled</Text>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredConsultations}
          renderItem={renderConsultation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FileText size={48} color={Colors.textLight} />
              <Text style={styles.emptyTitle}>No consultations found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.background,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  filterTabTextActive: {
    color: '#FFF',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  consultationCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  astrologerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 14,
  },
  consultationContent: {
    flex: 1,
  },
  consultationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  astrologerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  consultationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 8,
  },
  consultationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textLight,
  },
});
