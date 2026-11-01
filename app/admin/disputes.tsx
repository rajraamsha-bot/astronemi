import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { ConsultationQualityService, Dispute } from '@/services/consultation-quality';
import { Logger } from '@/services/logger';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';

type DisputeStatus = 'all' | 'open' | 'under_review' | 'resolved' | 'rejected';

export default function AdminDisputesScreen() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<DisputeStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [refundAmount, setRefundAmount] = useState('');

  const loadDisputes = useCallback(async () => {
    try {
      const rows = await ConsultationQualityService.listDisputes({ limit: 200 });
      setDisputes(rows);
    } catch (err) {
      Logger.error('Failed to load disputes', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDisputes();
  }, [loadDisputes]);

  const handleResolve = useCallback(
    async (status: 'resolved' | 'rejected') => {
      if (!selectedDispute) return;
      try {
        const result = await ConsultationQualityService.resolveDispute(selectedDispute.id, {
          status,
          resolution: resolutionText,
          refundAmount: refundAmount ? parseFloat(refundAmount) : undefined,
        });
        if (result.success) {
          Alert.alert('Success', `Dispute ${status === 'resolved' ? 'resolved' : 'rejected'} successfully`);
          setSelectedDispute(null);
          setResolutionText('');
          setRefundAmount('');
          loadDisputes();
        }
      } catch (err) {
        Logger.error('Failed to resolve dispute', err);
        Alert.alert('Error', 'Failed to resolve dispute');
      }
    },
    [selectedDispute, resolutionText, refundAmount, loadDisputes]
  );

  const filteredDisputes = disputes.filter((d) => {
    if (filter !== 'all' && d.status !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        d.description.toLowerCase().includes(query) ||
        d.reason.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return Colors.error;
      case 'under_review':
        return Colors.warning;
      case 'resolved':
        return Colors.success;
      case 'rejected':
        return Colors.textLight;
      default:
        return Colors.textLight;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertTriangle size={16} color={Colors.error} />;
      case 'under_review':
        return <Search size={16} color={Colors.warning} />;
      case 'resolved':
        return <CheckCircle size={16} color={Colors.success} />;
      case 'rejected':
        return <XCircle size={16} color={Colors.textLight} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <FeatureErrorBoundary featureName="Admin Disputes">
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading disputes...</Text>
        </View>
      </SafeAreaView>
      </FeatureErrorBoundary>
    );
  }

  return (
    <FeatureErrorBoundary featureName="Admin Disputes">
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dispute Resolution</Text>
        <View style={styles.emptyNav} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={18} color={Colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search disputes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={Colors.textLight}
        />
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
        {(['all', 'open', 'under_review', 'resolved', 'rejected'] as DisputeStatus[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.activeFilterChip]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>
              {f === 'under_review' ? 'Under Review' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Disputes List */}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
      >
        {filteredDisputes.length === 0 ? (
          <View style={styles.emptyState}>
            <Filter size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No disputes found</Text>
          </View>
        ) : (
          filteredDisputes.map((dispute) => (
            <TouchableOpacity
              key={dispute.id}
              style={styles.disputeCard}
              onPress={() => setSelectedDispute(dispute)}
            >
              <View style={styles.disputeHeader}>
                <View style={styles.disputeStatus}>
                  {getStatusIcon(dispute.status)}
                  <Text style={[styles.statusText, { color: getStatusColor(dispute.status) }]}>
                    {dispute.status === 'under_review' ? 'Under Review' : dispute.status}
                  </Text>
                </View>
                <Text style={styles.disputeDate}>
                  {new Date(dispute.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.disputeReason}>{dispute.reason}</Text>
              <Text style={styles.disputeDesc} numberOfLines={2}>
                {dispute.description}
              </Text>
              <View style={styles.disputeMeta}>
                <Text style={styles.metaText}>Consultation: {dispute.consultationId}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Resolution Modal */}
      {selectedDispute && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Resolve Dispute</Text>
            <Text style={styles.modalSubtitle}>{selectedDispute.reason}</Text>
            <Text style={styles.modalDesc}>{selectedDispute.description}</Text>

            <Text style={styles.inputLabel}>Resolution Notes</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              value={resolutionText}
              onChangeText={setResolutionText}
              placeholder="Describe your resolution..."
              placeholderTextColor={Colors.textLight}
            />

            <Text style={styles.inputLabel}>Refund Amount (optional)</Text>
            <TextInput
              style={styles.input}
              value={refundAmount}
              onChangeText={setRefundAmount}
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor={Colors.textLight}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleResolve('rejected')}
              >
                <XCircle size={18} color={Colors.error} />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.resolveButton]}
                onPress={() => handleResolve('resolved')}
              >
                <CheckCircle size={18} color={Colors.white} />
                <Text style={styles.resolveButtonText}>Resolve</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setSelectedDispute(null);
                setResolutionText('');
                setRefundAmount('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
    </FeatureErrorBoundary>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 15,
    color: Colors.text,
  },
  filterBar: {
    maxHeight: 50,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  activeFilterText: {
    color: Colors.white,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textLight,
  },
  disputeCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  disputeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  disputeDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  disputeReason: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  disputeDesc: {
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 18,
  },
  disputeMeta: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    textTransform: 'capitalize',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  rejectButton: {
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.error,
  },
  resolveButton: {
    backgroundColor: Colors.success,
  },
  resolveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  cancelButton: {
    alignItems: 'center',
    padding: 12,
  },
  cancelButtonText: {
    fontSize: 15,
    color: Colors.textLight,
    fontWeight: '600',
  },
});
