import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  X,
  Check,
  ShieldCheck,
} from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';
import { IAP_ENABLED } from '@/services/iap';
import { Logger } from '@/services/logger';

type IapTopUpProps = {
  userId: string;
  onCredited: (amount: number) => void;
  onError: (message: string) => void;
};

// Load the native IAP module only when top-ups are enabled. Expo Go and
// non-IAP builds must not import it at all.
let IapTopUp: React.ComponentType<IapTopUpProps> | null = null;
if (IAP_ENABLED) {
  try {
    IapTopUp = require('@/components/wallet/IapTopUp').IapTopUp;
  } catch (error) {
    Logger.warn('IAP module is unavailable in this build', { error });
  }
}

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  time: string;
  status: 'completed' | 'pending' | 'failed';
  reference?: string;
}

export default function WalletScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { walletBalance, refreshWalletBalance } = useApp();
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [creditedAmount, setCreditedAmount] = useState<number | null>(null);

  const { data: transactions = [], refetch } = useTransactions(user?.id, []);

  useFocusEffect(
    useCallback(() => {
      refetch();
      refreshWalletBalance().catch(() => {});
    }, [refetch, refreshWalletBalance]),
  );

  const openRecharge = () => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Please sign in to purchase AstroNemi Credits.');
      return;
    }
    setCreditedAmount(null);
    setShowRechargeModal(true);
  };

  const closeRecharge = () => {
    setShowRechargeModal(false);
    setCreditedAmount(null);
  };

  const handleCredited = (amount: number) => {
    setCreditedAmount(amount);
    refreshWalletBalance().catch(() => {});
    refetch().catch(() => {});
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={[
        styles.transactionIcon,
        { backgroundColor: item.type === 'credit' ? '#E8F5E9' : '#FFEBEE' }
      ]}>
        {item.type === 'credit' ? (
          <ArrowDownLeft size={20} color="#4CAF50" />
        ) : (
          <ArrowUpRight size={20} color="#F44336" />
        )}
      </View>
      <View style={styles.transactionContent}>
        <Text style={styles.transactionDescription}>{item.description}</Text>
        <View style={styles.transactionMeta}>
          <Text style={styles.transactionDate}>{item.date}</Text>
          <Text style={styles.transactionTime}>{item.time}</Text>
        </View>
        {item.reference && (
          <Text style={styles.transactionRef}>Ref: {item.reference}</Text>
        )}
      </View>
      <Text style={[
        styles.transactionAmount,
        { color: item.type === 'credit' ? '#4CAF50' : '#F44336' }
      ]}>
        {item.type === 'credit' ? '+' : '-'}Rs.{item.amount}
      </Text>
    </View>
  );

  return (
    <FeatureErrorBoundary featureName="Wallet">
      <View style={styles.container}>
        <LinearGradient colors={['#6B46C1', '#805AD5', '#9F7AEA']} style={styles.header}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <ArrowLeft color="#FFF" size={24} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{t('wallet.title')}</Text>
              <View style={{ width: 40 }} />
            </View>
          </SafeAreaView>

          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Available AstroNemi Credits</Text>
            <Text style={styles.balanceAmount}>Rs.{walletBalance}</Text>
            {IAP_ENABLED ? (
              <TouchableOpacity style={styles.addButton} onPress={openRecharge}>
                <Plus color="#6B46C1" size={20} />
                <Text style={styles.addButtonText}>Buy Credits</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.topupDisabledNote}>
                Credit top-ups are disabled in this build.
              </Text>
            )}
            <Text style={styles.creditsNote}>
              Service credits for consultations and app features. No cash value.
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.transactionsSection}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>{t('wallet.history')}</Text>
            <TouchableOpacity onPress={() => router.push('/wallet-terms')}>
              <Text style={styles.termsLink}>Wallet Terms</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={transactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.transactionsList}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <CreditCard size={36} color={Colors.textLight} />
                <Text style={styles.emptyText}>No credit transactions yet.</Text>
              </View>
            }
          />
        </View>

        <Modal
          visible={showRechargeModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={closeRecharge}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {creditedAmount !== null ? 'Credits Added' : 'Buy AstroNemi Credits'}
              </Text>
              <TouchableOpacity onPress={closeRecharge}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {creditedAmount !== null ? (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <Check size={44} color="#FFF" />
                </View>
                <Text style={styles.successTitle}>Purchase complete</Text>
                <Text style={styles.successText}>
                  {creditedAmount} AstroNemi Credits were added to your account.
                </Text>
                <TouchableOpacity style={styles.doneButton} onPress={closeRecharge}>
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.modalContent}>
                {IAP_ENABLED && user?.id && IapTopUp ? (
                  <IapTopUp
                    userId={user.id}
                    onCredited={handleCredited}
                    onError={(message) => Alert.alert('Purchase', message)}
                  />
                ) : (
                  <View style={styles.unavailableContainer}>
                    <ShieldCheck size={36} color={Colors.primary} />
                    <Text style={styles.unavailableTitle}>Credit top-ups are unavailable</Text>
                    <Text style={styles.unavailableText}>
                      This build does not have in-app purchases configured. Your existing credits
                      can still be used for consultations and app features.
                    </Text>
                  </View>
                )}

                <View style={styles.termsFooter}>
                  <TouchableOpacity onPress={() => router.push('/wallet-terms')}>
                    <Text style={styles.termsLink}>Read the Wallet Terms</Text>
                  </TouchableOpacity>
                  <Text style={styles.termsHint}>
                    Credits are non-transferable and have no cash value. Store purchases are final
                    except where required by law or store policy.
                  </Text>
                </View>
              </View>
            )}
          </SafeAreaView>
        </Modal>
      </View>
    </FeatureErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingBottom: 24 },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  balanceSection: { alignItems: 'center', paddingTop: 20, paddingHorizontal: 24 },
  balanceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  balanceAmount: { fontSize: 48, fontWeight: '800', color: '#FFF', marginTop: 8 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
    gap: 8,
  },
  addButtonText: { fontSize: 16, fontWeight: '600', color: '#6B46C1' },
  topupDisabledNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 14,
    textAlign: 'center',
  },
  creditsNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 15,
  },
  transactionsSection: { flex: 1, paddingTop: 20 },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  termsLink: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  transactionsList: { paddingHorizontal: 16, paddingBottom: 24 },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionContent: { flex: 1 },
  transactionDescription: { fontSize: 14, fontWeight: '600', color: Colors.text },
  transactionMeta: { flexDirection: 'row', gap: 8, marginTop: 3 },
  transactionDate: { fontSize: 11, color: Colors.textLight },
  transactionTime: { fontSize: 11, color: Colors.textLight },
  transactionRef: { fontSize: 10, color: Colors.textLight, marginTop: 3 },
  transactionAmount: { fontSize: 15, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { fontSize: 14, color: Colors.textLight, textAlign: 'center' },
  modalContainer: { flex: 1, backgroundColor: Colors.white },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  modalContent: { flex: 1, padding: 20 },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: { fontSize: 22, fontWeight: '700', color: Colors.text },
  successText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 28,
    marginTop: 28,
  },
  doneButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  unavailableContainer: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  unavailableTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  unavailableText: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 19,
  },
  termsFooter: { marginTop: 24, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 16 },
  termsHint: { fontSize: 11, color: Colors.textLight, lineHeight: 16, marginTop: 8 },
});
