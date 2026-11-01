import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowLeft,
  Gift,
  Users,
  Wallet,
  Copy,
  Share2,
  CheckCircle,
  Clock,
  Crown,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReferralStats } from '@/hooks/queries/useReferralStats';
import type { ReferralStatsData } from '@/services/referral';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';

interface ReferralReward {
  referrer: number;
  referee: number;
}

const REFERRAL_REWARD: ReferralReward = {
  referrer: Number(process.env.EXPO_PUBLIC_REFERRAL_BONUS) || 100,
  referee: 50,
};

const EMPTY_STATS: ReferralStatsData = {
  referralCode: '',
  totalReferrals: 0,
  successfulReferrals: 0,
  pendingReferrals: 0,
  totalEarned: 0,
  currentMonthEarned: 0,
  referralHistory: [],
};

export default function ReferralScreen() {
  const { user } = useUser();
  const { applyReferralCode } = useAuth();
  const code = user?.referralCode ?? '';
  const { data: referralStats = { ...EMPTY_STATS, referralCode: code }, isLoading } = useReferralStats(
    user?.id,
    code,
  );
  const [enteredCode, setEnteredCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [applying, setApplying] = useState(false);
  const { t } = useLanguage();

  const handleCopyCode = async () => {
    if (!referralStats.referralCode) return;
    try {
      await Clipboard.setStringAsync(referralStats.referralCode);
    } catch {
      // silent — still flash the copied badge so UX is consistent
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!referralStats.referralCode) {
      Alert.alert(t('referral.noCodeYet'), t('referral.noCodeYetMsg'));
      return;
    }
    try {
      await Share.share({
        message: `Join AstroNemi and get FREE wallet balance! Use my referral code: ${referralStats.referralCode} to get Rs. ${REFERRAL_REWARD.referee} in your wallet. Download now: https://play.google.com/store/apps/details?id=com.astronemi.astronemi`,
        title: 'Invite Friends to AstroNemi',
      });
    } catch {
      Alert.alert(t('common.error'), t('referral.shareFailed'));
    }
  };

  const handleApplyCode = async () => {
    const input = enteredCode.trim();
    if (!input) {
      Alert.alert(t('common.error'), t('referral.enterCode'));
      return;
    }
    if (input === referralStats.referralCode) {
      Alert.alert(t('common.error'), t('referral.ownCode'));
      return;
    }
    setApplying(true);
    try {
      const ok = await applyReferralCode(input);
      if (ok) {
        Alert.alert(
          t('referral.codeApplied'),
          t('referral.codeAppliedMsg', { amount: String(REFERRAL_REWARD.referee) }),
          [{ text: 'OK', onPress: () => setEnteredCode('') }],
        );
      } else {
        Alert.alert(t('referral.invalidCode'), t('referral.invalidCodeMsg'));
      }
    } finally {
      setApplying(false);
    }
  };

  return (
    <FeatureErrorBoundary featureName="Referral">
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFD700', '#FFA500', '#FF8C00']}
        style={styles.header}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft color="#FFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('referral.title')}</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Banner */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.heroBanner}
        >
          <View style={styles.heroContent}>
            <Gift color="#FFD700" size={48} />
            <Text style={styles.heroTitle}>{t('referral.earnPerReferral', { amount: String(REFERRAL_REWARD.referrer) })}</Text>
            <Text style={styles.heroSubtitle}>
              {t('referral.heroSubtitle')}
            </Text>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>Rs. {REFERRAL_REWARD.referee}</Text>
              <Text style={styles.heroStatLabel}>{t('referral.friendGets')}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>Rs. {REFERRAL_REWARD.referrer}</Text>
              <Text style={styles.heroStatLabel}>{t('referral.youEarn')}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Referral Code Section */}
        <View style={styles.codeSection}>
          <Text style={styles.sectionTitle}>{t('referral.yourCode')}</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{referralStats.referralCode || '—'}</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyCode}
              accessibilityLabel="Copy referral code"
              disabled={!referralStats.referralCode}
            >
              {copied ? (
                <CheckCircle color="#4CAF50" size={24} />
              ) : (
                <Copy color="#666" size={24} />
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Share2 color="#FFF" size={20} />
            <Text style={styles.shareButtonText}>{t('referral.shareWithFriends')}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
            <Users color="#2196F3" size={24} />
            <Text style={styles.statValue}>{referralStats.totalReferrals}</Text>
            <Text style={styles.statLabel}>{t('referral.totalReferrals')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
            <CheckCircle color="#4CAF50" size={24} />
            <Text style={styles.statValue}>{referralStats.successfulReferrals}</Text>
            <Text style={styles.statLabel}>{t('referral.successful')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
            <Clock color="#FF9800" size={24} />
            <Text style={styles.statValue}>{referralStats.pendingReferrals}</Text>
            <Text style={styles.statLabel}>{t('referral.pending')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FCE4EC' }]}>
            <Wallet color="#E91E63" size={24} />
            <Text style={styles.statValue}>Rs. {referralStats.totalEarned}</Text>
            <Text style={styles.statLabel}>{t('referral.totalEarned')}</Text>
          </View>
        </View>

        {/* Enter Referral Code */}
        <View style={styles.enterCodeSection}>
          <Text style={styles.sectionTitle}>{t('referral.haveCode')}</Text>
          <Text style={styles.sectionSubtitle}>
            {t('referral.enterCodeSubtitle', { amount: String(REFERRAL_REWARD.referee) })}
          </Text>
          <View style={styles.enterCodeContainer}>
            <TextInput
              style={styles.codeInput}
              placeholder={t('referral.referralCodePlaceholder')}
              placeholderTextColor="#999"
              value={enteredCode}
              onChangeText={setEnteredCode}
              autoCapitalize="characters"
              maxLength={10}
            />
            <TouchableOpacity
              style={[styles.applyButton, applying && { opacity: 0.6 }]}
              onPress={handleApplyCode}
              disabled={applying}
              accessibilityRole="button"
            >
              {applying ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.applyButtonText}>{t('referral.apply')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.howItWorksSection}>
          <Text style={styles.sectionTitle}>{t('referral.howItWorks')}</Text>
          <View style={styles.stepsContainer}>
            <View style={styles.stepItem}>
              <View style={[styles.stepNumber, { backgroundColor: '#E3F2FD' }]}>
                <Text style={[styles.stepNumberText, { color: '#2196F3' }]}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{t('referral.step1Title')}</Text>
                <Text style={styles.stepDescription}>
                  {t('referral.step1Desc')}
                </Text>
              </View>
            </View>
            <View style={styles.stepItem}>
              <View style={[styles.stepNumber, { backgroundColor: '#E8F5E9' }]}>
                <Text style={[styles.stepNumberText, { color: '#4CAF50' }]}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{t('referral.step2Title')}</Text>
                <Text style={styles.stepDescription}>
                  {t('referral.step2Desc')}
                </Text>
              </View>
            </View>
            <View style={styles.stepItem}>
              <View style={[styles.stepNumber, { backgroundColor: '#FCE4EC' }]}>
                <Text style={[styles.stepNumberText, { color: '#E91E63' }]}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{t('referral.step3Title')}</Text>
                <Text style={styles.stepDescription}>
                  {t('referral.step3Desc', { you: String(REFERRAL_REWARD.referrer), friend: String(REFERRAL_REWARD.referee) })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Referral History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>{t('referral.referralHistory')}</Text>
          {isLoading ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <ActivityIndicator color="#667eea" />
            </View>
          ) : referralStats.referralHistory.length === 0 ? (
            <Text style={{ padding: 16, color: '#999', fontSize: 13, textAlign: 'center' }}>
              {t('referral.noReferrals')}
            </Text>
          ) : (
            referralStats.referralHistory.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={styles.historyInfo}>
                <View style={styles.historyAvatar}>
                  <Text style={styles.historyAvatarText}>
                    {item.name.charAt(0)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.historyName}>{item.name}</Text>
                  <Text style={styles.historyDate}>{item.date}</Text>
                </View>
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyReward}>+Rs. {item.reward}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        item.status === 'completed' ? '#E8F5E9' : '#FFF3E0',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          item.status === 'completed' ? '#4CAF50' : '#FF9800',
                      },
                    ]}
                  >
                    {item.status === 'completed' ? t('referral.completed') : t('referral.pending')}
                  </Text>
                </View>
              </View>
            </View>
          ))
          )}
        </View>

        {/* Premium Bonus */}
        <View style={styles.premiumBonusSection}>
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            style={styles.premiumBonusCard}
          >
            <Crown color="#FFF" size={32} />
            <View style={styles.premiumBonusContent}>
              <Text style={styles.premiumBonusTitle}>{t('referral.premiumBonus')}</Text>
              <Text style={styles.premiumBonusText}>
                {t('referral.premiumBonusText')}
              </Text>
            </View>
            <View style={styles.premiumProgress}>
              <Text style={styles.premiumProgressText}>
                {referralStats.successfulReferrals}/10
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>{t('referral.terms')}</Text>
          <Text style={styles.termsText}>
            {'\n'}· {t('referral.term1')}
            {'\n'}· {t('referral.term2')}
            {'\n'}· {t('referral.term3')}
            {'\n'}· {t('referral.term4')}
            {'\n'}· {t('referral.term5')}
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
    </FeatureErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingBottom: 16,
  },
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  content: {
    flex: 1,
  },
  heroBanner: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
    overflow: 'hidden',
  },
  heroContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    textAlign: 'center',
  },
  heroStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 16,
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFD700',
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  codeSection: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
  },
  codeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    letterSpacing: 4,
    flex: 1,
    textAlign: 'center',
  },
  copyButton: {
    padding: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    marginTop: 20,
  },
  statCard: {
    width: '46%',
    margin: '2%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  enterCodeSection: {
    backgroundColor: '#FFF',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  enterCodeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  codeInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  applyButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  howItWorksSection: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  stepsContainer: {
    marginTop: 8,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  historySection: {
    backgroundColor: '#FFF',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  historyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyAvatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  historyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  historyDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyReward: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  premiumBonusSection: {
    marginHorizontal: 16,
  },
  premiumBonusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    overflow: 'hidden',
  },
  premiumBonusContent: {
    flex: 1,
    marginLeft: 16,
  },
  premiumBonusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  premiumBonusText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  premiumProgress: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  premiumProgressText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  termsSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  termsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  termsText: {
    fontSize: 12,
    color: '#999',
    lineHeight: 20,
  },
});