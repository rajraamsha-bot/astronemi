import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Crown, Check, Star, Zap, Diamond, X, ChevronRight, Gift, ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AI_FEATURES_ENABLED, isAIPlanFeature } from '@/config/ai-features';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';
import { IapPlanPurchase } from '@/components/subscription/IapPlanPurchase';
import { IAP_ENABLED } from '@/services/iap';

interface Plan {
  id: 'free' | 'basic' | 'premium' | 'gold';
  name: string;
  price: number;
  originalPrice: number;
  duration: string;
  features: string[];
  highlighted?: boolean;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    originalPrice: 0,
    duration: 'Forever',
    features: [
      'dailyHoroscope',
      'basicPanchang',
      'limitedAiChat',
      'viewAstrologerProfiles',
    ],
    icon: Star,
    color: Colors.textLight,
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 199,
    originalPrice: 299,
    duration: 'month',
    features: [
      'allFreeFeatures',
      'weeklyMonthlyHoroscopes',
      'unlimitedAiChat',
      'freeConsultationMinutes',
      'saveMultipleKundlis',
      'adFree',
    ],
    icon: Zap,
    color: Colors.primary,
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 499,
    originalPrice: 799,
    duration: 'month',
    features: [
      'allBasicFeatures',
      'yearlyPredictions',
      'transitReports',
      'freeConsultationMinutes',
      'priorityAstrologerAccess',
      'pdfReportDownloads',
      'exclusiveRemedies',
    ],
    icon: Crown,
    color: Colors.purple,
    highlighted: true,
  },
  {
    id: 'gold',
    name: 'Gold',
    price: 999,
    originalPrice: 1499,
    duration: 'month',
    features: [
      'allPremiumFeatures',
      'unlimitedConsultations',
      'vipAstrologerAccess',
      'personalizedDailyGuidance',
      'sadeSatiAlerts',
      'familyKundliStorage',
      'prioritySupport247',
      'exclusiveEventsAccess',
    ],
    icon: Diamond,
    color: Colors.gold,
  },
];

const yearlyDiscount = 0.4; // 40% off for yearly

export default function SubscriptionScreen() {
  const { currentSubscription, refreshSubscription } = useUser();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isYearly, setIsYearly] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const { user, refreshUserProfile } = useAuth();
  const { t } = useLanguage();

  const handleSubscribe = async (plan: Plan) => {
    if (plan.id === 'free') {
      Alert.alert(t('subscription.freePlanAlert'), t('subscription.freePlanMsg'));
      return;
    }
    if (!user) {
      Alert.alert(
        t('subscription.loginRequired'),
        t('subscription.loginRequiredMsg'),
        [
          { text: t('subscription.cancel'), style: 'cancel' },
          { text: t('subscription.login'), onPress: () => router.push('/login') },
        ]
      );
      return;
    }
    setSelectedPlan(plan);
    setShowPayment(true);
  };

  const handleActivated = () => {
    setShowPayment(false);
    refreshUserProfile().catch(() => {});
    refreshSubscription().catch(() => {});
    Alert.alert(
      '🎉 ' + t('subscription.successTitle'),
      `${t('subscription.subscribedMsg')} ${selectedPlan ? t('subscription.' + selectedPlan.id) : ''}!`,
    );
  };

  const getPrice = (plan: Plan) => {
    if (plan.price === 0) return t('subscription.free');
    const finalPrice = isYearly ? Math.round(plan.price * 12 * (1 - yearlyDiscount)) : plan.price;
    return `Rs. ${finalPrice}`;
  };

  const getOriginalPrice = (plan: Plan) => {
    if (plan.price === 0) return '';
    const original = isYearly ? plan.originalPrice * 12 : plan.originalPrice;
    return `Rs. ${original}`;
  };

  return (
    <FeatureErrorBoundary featureName="Subscription">
    <>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft color={Colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('subscription.title')}</Text>
          <View style={styles.backButton} />
        </View>
        
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Crown size={32} color={Colors.white} />
            <Text style={styles.headerTitle}>{t('subscription.unlockDestiny')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('subscription.choosePlan')}
            </Text>
          </View>

          {/* Current Plan */}
          {currentSubscription && (
            <View style={styles.currentPlanCard}>
              <Text style={styles.currentPlanLabel}>{t('subscription.currentPlanLabel')}</Text>
              <Text style={styles.currentPlanName}>
                {t('subscription.' + (plans.find(p => p.id === currentSubscription.plan)?.id || 'free'))}
              </Text>
              <Text style={styles.currentPlanExpiry}>
                {t('subscription.validUntil')} {currentSubscription.endDate.toLocaleDateString()}
              </Text>
            </View>
          )}

          {/* Billing Toggle */}
          <View style={styles.billingToggle}>
            <TouchableOpacity
              style={[styles.billingOption, !isYearly && styles.billingOptionActive]}
              onPress={() => setIsYearly(false)}
            >
              <Text style={[styles.billingText, !isYearly && styles.billingTextActive]}>
                {t('subscription.monthly')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.billingOption, isYearly && styles.billingOptionActive]}
              onPress={() => setIsYearly(true)}
            >
              <Text style={[styles.billingText, isYearly && styles.billingTextActive]}>
                {t('subscription.yearly')}
              </Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveText}>{t('subscription.savePercent')}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Plans */}
          <View style={styles.plansContainer}>
            {plans.map((plan) => {
              const IconComponent = plan.icon;
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    plan.highlighted && styles.planCardHighlighted,
                  ]}
                  onPress={() => handleSubscribe(plan)}
                >
                  {plan.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>{t('subscription.mostPopular')}</Text>
                    </View>
                  )}

                  <View style={styles.planHeader}>
                    <View style={[styles.planIcon, { backgroundColor: plan.color + '20' }]}>
                      <IconComponent size={28} color={plan.color} />
                    </View>
                    <View style={styles.planTitleRow}>
                      <Text style={styles.planName}>{t('subscription.' + plan.id)}</Text>
                      <Text style={styles.planDuration}>
                        {plan.id === 'free'
                          ? t('subscription.free')
                          : (isYearly && plan.price > 0 ? t('subscription.perYear') : t('subscription.perMonth'))}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.planPricing}>
                    <Text style={[styles.planPrice, { color: plan.color }]}>
                      {getPrice(plan)}
                    </Text>
                    {plan.originalPrice > 0 && (
                      <Text style={styles.originalPrice}>
                        {getOriginalPrice(plan)}
                      </Text>
                    )}
                    {isYearly && plan.price > 0 && (
                      <Text style={styles.yearlyNote}>
                        Rs. {Math.round(plan.price * (1 - yearlyDiscount))}/{t('subscription.monthly').toLowerCase()}
                      </Text>
                    )}
                  </View>

                  <View style={styles.featuresList}>
                    {plan.features
                      .filter((feature) => !isAIPlanFeature(feature))
                      .map((feature, idx) => (
                        <View key={idx} style={styles.featureItem}>
                          <Check size={16} color={Colors.success} />
                          <Text style={styles.featureText}>{t('subscription.subFeatures.' + feature)}</Text>
                        </View>
                      ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.subscribeButton, { backgroundColor: plan.color }]}
                    onPress={() => handleSubscribe(plan)}
                  >
                    <Text style={styles.subscribeButtonText}>
                      {plan.price === 0 ? t('subscription.currentPlanButton') : t('subscription.subscribeNow')}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Compare Plans */}
          <View style={styles.compareSection}>
            <Text style={styles.sectionTitle}>{t('subscription.comparePlans')}</Text>
            <View style={styles.compareTable}>
              <View style={styles.compareRow}>
                <Text style={styles.compareFeature}>{t('subscription.compare.dailyHoroscope')}</Text>
                <Text style={styles.compareValue}>{t('subscription.compare.allPlans')}</Text>
              </View>
              <View style={styles.compareRow}>
                <Text style={styles.compareFeature}>{t('subscription.compare.weeklyMonthlyHoroscope')}</Text>
                <Text style={styles.compareValue}>{t('subscription.compare.basicPlus')}</Text>
              </View>
              {AI_FEATURES_ENABLED && (
                <View style={styles.compareRow}>
                  <Text style={styles.compareFeature}>{t('subscription.compare.aiChat')}</Text>
                  <Text style={styles.compareValue}>{t('subscription.compare.unlimitedBasic')}</Text>
                </View>
              )}
              <View style={styles.compareRow}>
                <Text style={styles.compareFeature}>{t('subscription.compare.freeMinutes')}</Text>
                <Text style={styles.compareValue}>{t('subscription.compare.mins5to50')}</Text>
              </View>
              <View style={styles.compareRow}>
                <Text style={styles.compareFeature}>{t('subscription.compare.pdfReports')}</Text>
                <Text style={styles.compareValue}>{t('subscription.compare.premiumPlus')}</Text>
              </View>
              <View style={styles.compareRow}>
                <Text style={styles.compareFeature}>{t('subscription.compare.vipAstrologers')}</Text>
                <Text style={styles.compareValue}>{t('subscription.compare.goldOnly')}</Text>
              </View>
            </View>
          </View>

          {/* Referral Banner */}
          <View style={styles.referralBanner}>
            <Gift size={24} color={Colors.white} />
            <View style={styles.referralInfo}>
              <Text style={styles.referralTitle}>{t('subscription.referEarn')}</Text>
              <Text style={styles.referralText}>
                {t('subscription.referEarnText')}
              </Text>
            </View>
            <ChevronRight size={20} color={Colors.white} />
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Payment Modal */}
        <Modal
          visible={showPayment}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPayment(false)}
        >
          {selectedPlan && (
            <SafeAreaView style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('subscription.completeSubscription')}</Text>
                <TouchableOpacity onPress={() => setShowPayment(false)}>
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                <View style={styles.orderSummary}>
                  <Text style={styles.summaryTitle}>{t('subscription.orderSummary')}</Text>
                  
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('subscription.plan')}</Text>
                    <Text style={styles.summaryValue}>{t('subscription.' + selectedPlan.id)}</Text>
                  </View>
                  
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('subscription.billing')}</Text>
                    <Text style={styles.summaryValue}>
                      {isYearly ? t('subscription.yearly') : t('subscription.monthly')}
                    </Text>
                  </View>
                  
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('subscription.duration')}</Text>
                    <Text style={styles.summaryValue}>
                      {isYearly ? t('subscription.months12') : t('subscription.month1')}
                    </Text>
                  </View>

                  <View style={styles.divider} />
                  <Text style={styles.storePriceNote}>
                    Final price and taxes are shown by the App Store or Google Play.
                  </Text>
                </View>

                {IAP_ENABLED && user?.id ? (
                  <IapPlanPurchase
                    kind="subscription"
                    planId={selectedPlan.id}
                    durationDays={isYearly ? 365 : 30}
                    userId={user.id}
                    onActivated={handleActivated}
                    onError={(message) => Alert.alert(t('subscription.paymentFailed'), message)}
                  />
                ) : (
                  <View style={styles.iapUnavailable}>
                    <Text style={styles.iapUnavailableTitle}>Purchases are unavailable</Text>
                    <Text style={styles.iapUnavailableText}>
                      This build does not have App Store / Google Play purchases configured yet.
                    </Text>
                  </View>
                )}

                <Text style={styles.termsText}>
                  Non-renewing pass. It does not auto-renew. Access ends after the period shown.
                </Text>
              </ScrollView>
            </SafeAreaView>
          )}
        </Modal>
      </SafeAreaView>
    </>
    </FeatureErrorBoundary>
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
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  headerBanner: {
    backgroundColor: Colors.purple,
    padding: 20,
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 4,
    textAlign: 'center',
  },
  currentPlanCard: {
    backgroundColor: Colors.white,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  currentPlanLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  currentPlanName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 4,
  },
  currentPlanExpiry: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  billingToggle: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 4,
  },
  billingOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  billingOptionActive: {
    backgroundColor: Colors.primary,
  },
  billingText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  billingTextActive: {
    color: Colors.white,
  },
  saveBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  saveText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
  plansContainer: {
    padding: 16,
    gap: 16,
  },
  planCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    position: 'relative',
  },
  planCardHighlighted: {
    borderWidth: 2,
    borderColor: Colors.purple,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planTitleRow: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  planDuration: {
    fontSize: 12,
    color: Colors.textLight,
  },
  planPricing: {
    marginBottom: 16,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '700',
  },
  originalPrice: {
    fontSize: 14,
    color: Colors.textLight,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  yearlyNote: {
    fontSize: 12,
    color: Colors.success,
    marginTop: 4,
  },
  featuresList: {
    marginBottom: 16,
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  subscribeButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  compareSection: {
    padding: 16,
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  compareTable: {
    gap: 8,
  },
  compareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  compareFeature: {
    fontSize: 13,
    color: Colors.text,
  },
  compareValue: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primary,
  },
  referralBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    margin: 16,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  referralInfo: {
    flex: 1,
  },
  referralTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  referralText: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 2,
  },
  modal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  orderSummary: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  totalRow: {
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  paymentMethods: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  paymentRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  paymentRadioSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '20',
  },
  paymentMethodText: {
    fontSize: 14,
    color: Colors.text,
  },
  payButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
  },
  storePriceNote: {
    fontSize: 12,
    color: Colors.textLight,
    lineHeight: 17,
  },
  iapUnavailable: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  iapUnavailableTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  iapUnavailableText: {
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 18,
  },
  termsText: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
});