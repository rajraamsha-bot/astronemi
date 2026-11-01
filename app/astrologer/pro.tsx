/**
 * AstroProSubscribeScreen
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Crown, Sparkles, Star, X } from 'lucide-react-native';
import { AppTheme, useAppTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAstrologerProPlans, useAstrologerSubscription } from '@/hooks/useAstrologerPro';
import { useToast } from '@/contexts/ToastContext';
import { IapPlanPurchase } from '@/components/subscription/IapPlanPurchase';
import { IAP_ENABLED } from '@/services/iap';

interface Props {
  astrologerId: string;
}

export default function AstroProSubscribeScreen({ astrologerId }: Props) {
  const Colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const { plans, loading } = useAstrologerProPlans();
  const { subscription, refresh: refreshSubscription } = useAstrologerSubscription(astrologerId);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [pendingSlug, setPendingSlug] = useState<'pro' | 'elite' | null>(null);
  const [purchaseSlug, setPurchaseSlug] = useState<'pro' | 'elite' | null>(null);
  const { user } = useAuth();
  const toast = useToast();

  const freePlan = plans.find(p => p.slug === 'free');
  const proPlan = plans.find(p => p.slug === 'pro');
  const elitePlan = plans.find(p => p.slug === 'elite');

  const handleSubscribe = (slug: 'pro' | 'elite') => {
    if (!user?.id) {
      toast.showToast('Please sign in to buy an AstroPro pass.', 'error');
      return;
    }
    setPendingSlug(slug);
    setPurchaseSlug(slug);
  };

  const closePurchase = () => {
    setPurchaseSlug(null);
    setPendingSlug(null);
  };

  const handleActivated = () => {
    setPurchaseSlug(null);
    setPendingSlug(null);
    refreshSubscription().catch(() => {});
    toast.showToast('Pass activated. Welcome aboard!', 'success');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Sparkles size={28} color={Colors.primary} />
          <Text style={styles.title}>AstroPro</Text>
          <Text style={styles.subtitle}>Get more consultations. Set your own rates. Go live.</Text>
        </View>

        {subscription && (
          <View style={styles.currentPlan}>
            <Text style={styles.currentPlanLabel}>Your current plan</Text>
            <Text style={styles.currentPlanName}>{subscription.planDisplayName}</Text>
            {subscription.currentPeriodEnd && (
              <Text style={styles.currentPlanExpiry}>
                Ends on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}

        <View style={styles.billingToggle}>
          {(['monthly', 'yearly'] as const).map(b => (
            <Pressable
              key={b}
              style={[styles.billingOption, billing === b && styles.billingOptionActive]}
              onPress={() => setBilling(b)}
            >
              <Text style={[styles.billingText, billing === b && styles.billingTextActive]}>
                {b === 'monthly' ? 'Monthly' : 'Yearly (save ~17%)'}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
        ) : (
          <>
            <PlanCard
              name={proPlan?.displayName ?? 'AstroPro'}
              priceInr={billing === 'yearly' ? (proPlan?.yearlyPriceInr ?? 19999) : (proPlan?.monthlyPriceInr ?? 1999)}
              billing={billing}
              features={proPlan?.features ?? []}
              color={Colors.primary}
              icon={<Sparkles size={20} color={Colors.primary} />}
              isCurrent={subscription?.planSlug === 'pro'}
              isPending={pendingSlug === 'pro'}
              onSubscribe={() => handleSubscribe('pro')}
            />
            <PlanCard
              name={elitePlan?.displayName ?? 'AstroElite'}
              priceInr={billing === 'yearly' ? (elitePlan?.yearlyPriceInr ?? 49999) : (elitePlan?.monthlyPriceInr ?? 4999)}
              billing={billing}
              features={elitePlan?.features ?? []}
              color="#D97706"
              icon={<Crown size={20} color="#D97706" />}
              isCurrent={subscription?.planSlug === 'elite'}
              isPending={pendingSlug === 'elite'}
              onSubscribe={() => handleSubscribe('elite')}
              recommended
            />
          </>
        )}

        {freePlan && (
          <View style={styles.freeBox}>
            <Text style={styles.freeTitle}>Free plan</Text>
            <Text style={styles.freeText}>{freePlan.features.join('. ')}</Text>
          </View>
        )}

        <Text style={styles.fineprint}>
          Passes do not auto-renew. Access ends on the date shown; buy another pass to extend.
          Payment and refunds are handled by the App Store or Google Play.
        </Text>
      </ScrollView>

      <Modal
        visible={purchaseSlug !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closePurchase}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {purchaseSlug === 'elite' ? 'AstroElite pass' : 'AstroPro pass'}
            </Text>
            <TouchableOpacity onPress={closePurchase}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            {IAP_ENABLED && user?.id && purchaseSlug ? (
              <IapPlanPurchase
                kind="astrologer_subscription"
                planId={purchaseSlug}
                durationDays={billing === 'yearly' ? 365 : 30}
                userId={user.id}
                onActivated={handleActivated}
                onError={(message) => toast.showToast(message, 'error')}
              />
            ) : (
              <View style={styles.purchaseUnavailable}>
                <Text style={styles.purchaseUnavailableTitle}>Purchases are unavailable</Text>
                <Text style={styles.purchaseUnavailableText}>
                  This build does not have App Store / Google Play purchases configured yet.
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

interface PlanCardProps {
  name: string;
  priceInr: number;
  billing: 'monthly' | 'yearly';
  features: string[];
  color: string;
  icon: React.ReactNode;
  isCurrent: boolean;
  isPending: boolean;
  onSubscribe: () => void;
  recommended?: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({ name, priceInr, billing, features, color, icon, isCurrent, isPending, onSubscribe, recommended }) => {
  const Colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={[styles.card, recommended && { borderColor: color, borderWidth: 2 }]}>
      {recommended && (
        <View style={[styles.recommendedBadge, { backgroundColor: color }]}>
          <Star size={11} color={Colors.white} />
          <Text style={styles.recommendedText}>RECOMMENDED</Text>
        </View>
      )}
      <View style={styles.cardHeader}>
        {icon}
        <Text style={styles.cardName}>{name}</Text>
      </View>
      <Text style={styles.cardPrice}>
        &#8377;{priceInr.toLocaleString('en-IN')}
        <Text style={styles.cardBilling}> /{billing === 'yearly' ? 'year' : 'month'}</Text>
      </Text>
      <View style={styles.features}>
        {features.map(f => (
          <View key={f} style={styles.featureRow}>
            <Check size={14} color={Colors.success} />
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>
      <Pressable
        style={[
          styles.cta,
          { backgroundColor: color },
          isCurrent && { backgroundColor: Colors.textMuted },
        ]}
        disabled={isCurrent || isPending}
        onPress={onSubscribe}
        accessibilityRole="button"
      >
        {isPending ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.ctaText}>
            {isCurrent ? 'Current plan' : `Upgrade to ${name}`}
          </Text>
        )}
      </Pressable>
    </View>
  );
};

const createStyles = (Colors: AppTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 20, paddingBottom: 40 },
    header: { alignItems: 'center', marginBottom: 16, marginTop: 4 },
    title: { fontSize: 28, fontWeight: '800', color: Colors.text, marginTop: 8 },
    subtitle: { fontSize: 13, color: Colors.textLight, textAlign: 'center', marginTop: 6 },
    currentPlan: {
      backgroundColor: Colors.primaryLight,
      padding: 12,
      borderRadius: 10,
      marginBottom: 16,
      alignItems: 'center',
    },
    currentPlanLabel: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
    currentPlanName: { fontSize: 18, fontWeight: '800', color: Colors.primary, marginTop: 4 },
    currentPlanExpiry: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
    billingToggle: {
      flexDirection: 'row',
      backgroundColor: Colors.card,
      borderRadius: 12,
      padding: 4,
      marginBottom: 16,
    },
    billingOption: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
    billingOptionActive: { backgroundColor: Colors.primary },
    billingText: { fontSize: 13, color: Colors.textLight, fontWeight: '600' },
    billingTextActive: { color: Colors.white },
    card: {
      backgroundColor: Colors.card,
      padding: 16,
      borderRadius: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: Colors.border,
      position: 'relative',
    },
    recommendedBadge: {
      position: 'absolute',
      top: -10,
      right: 12,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      gap: 4,
    },
    recommendedText: { color: Colors.white, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    cardName: { fontSize: 18, fontWeight: '700', color: Colors.text },
    cardPrice: { fontSize: 24, fontWeight: '800', color: Colors.text, marginVertical: 8 },
    cardBilling: { fontSize: 13, fontWeight: '500', color: Colors.textLight },
    features: { marginVertical: 8 },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginVertical: 4 },
    featureText: { fontSize: 13, color: Colors.text, flex: 1 },
    cta: {
      padding: 12,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 8,
    },
    ctaText: { color: Colors.white, fontSize: 14, fontWeight: '700' },
    freeBox: {
      backgroundColor: Colors.card,
      padding: 14,
      borderRadius: 12,
      marginTop: 12,
    },
    freeTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 6 },
    freeText: { fontSize: 12, color: Colors.textLight, lineHeight: 18 },
    fineprint: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 16 },
    modalContainer: { flex: 1, backgroundColor: Colors.background },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      backgroundColor: Colors.card,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
    modalContent: { padding: 20 },
    purchaseUnavailable: {
      backgroundColor: Colors.card,
      borderRadius: 12,
      padding: 16,
      gap: 6,
    },
    purchaseUnavailableTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
    purchaseUnavailableText: { fontSize: 13, color: Colors.textLight, lineHeight: 18 },
  });
