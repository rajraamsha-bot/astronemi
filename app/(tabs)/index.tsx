import { useState, useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Animated, RefreshControl, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Wallet as WalletIcon, Star, Calendar, 
  FileText, Heart
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme, AppTheme } from '@/contexts/ThemeContext';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTopAstrologers } from '@/hooks/queries/useTopAstrologers';
import { useUserEngagement } from '@/contexts/UserEngagementContext';
import { createButtonA11yProps } from '@/utils/accessibility-helpers';

import { AstrologerCard } from '@/components/home/AstrologerCard';
import TierProgressCard from '@/components/home/TierProgressCard';
import { CosmicTicker } from '@/components/home/CosmicTicker';
import { PanchangSnapshot } from '@/components/home/PanchangSnapshot';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import { Gradients, Shadows, Typography } from '@/constants/theme';
import { ZODIAC_SIGNS } from '@/constants/zodiac';

export default function HomeScreen() {
  const router = useRouter();
  const Colors = useAppTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const { walletBalance = 0 } = useApp();
  const { user, isHydrating } = useAuth();
  const { engagement, completeOnboarding, isLoading: engagementLoading } = useUserEngagement();
  // Wait for both auth and engagement hydration to finish before determining onboarding status.
  const showOnboarding = !engagementLoading && !engagement.completedOnboarding;
  
  const firstName = user?.name?.split(' ')[0] || null;
  const [scrollY] = useState(new Animated.Value(0));

  const { data: topAstrologers = [], isLoading: loading, refetch } = useTopAstrologers(5);

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Shared data (localized)
  const zodiacSigns = useMemo(() => {
    const colors = [
      '#FF5722', '#4CAF50', '#2196F3', '#9C27B0', 
      '#FF9800', '#673AB7', '#00BCD4', '#E91E63', 
      '#FFC107', '#795548', '#3F51B5', '#009688'
    ];
    
    return ZODIAC_SIGNS.map((sign, index) => ({
      id: sign.id,
      name: t(`zodiac.${sign.id}`) || sign.name,
      emoji: sign.symbol,
      color: colors[index] || '#6B46C1'
    }));
  }, [t]);

  const quickLinks = useMemo(() => [
    { id: 'kundli', title: t('nav.kundli'), icon: FileText, color: '#6B46C1', route: '/kundli' as const },
    { id: 'match', title: t('matching.title'), icon: Heart, color: '#E91E63', route: '/matching' as const },
    { id: 'panchang', title: t('services.panchang'), icon: Calendar, color: '#FF9800', route: '/panchang' as const },
    { id: 'horoscope', title: t('nav.horoscope'), icon: Star, color: '#2196F3', route: '/horoscope' as const },
  ], [t]);

  // Wait for hydration before showing either onboarding or main dashboard
  if (isHydrating || engagementLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Show onboarding for new users
  if (showOnboarding) {
    return (
      <OnboardingFlow
        onComplete={completeOnboarding}
        onSkip={completeOnboarding}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FeatureErrorBoundary featureName="Home Screen">
      {/* 🔮 PREMIUM HEADER (Animated) */}
      <Animated.View style={[
        styles.headerGradientContainer,
        {
          opacity: scrollY.interpolate({
            inputRange: [0, 80],
            outputRange: [1, 0.9],
            extrapolate: 'clamp'
          }),
          transform: [{
            translateY: scrollY.interpolate({
              inputRange: [0, 100],
              outputRange: [0, -10],
              extrapolate: 'clamp'
            })
          }]
        }
      ]}>
        <LinearGradient
          colors={Gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={['top']}>
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>
                  {firstName ? `${t('home.greeting')}, ${firstName}! 🙏` : `${t('home.greeting')} 🙏`}
                </Text>
                <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
              </View>
              <View style={styles.headerRight}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  icon="notifications-outline" 
                  title="" 
                  onPress={() => router.push('/profile')}
                  containerStyle={styles.headerIconBtn}
                />
                <Card variant="glass" padding="none" borderRadius="full" onPress={() => router.push('/wallet')} {...createButtonA11yProps('Wallet', `View wallet balance of ${walletBalance} rupees`, false)}>
                  <View style={styles.walletBadge}>
                     <WalletIcon size={16} color="#FFF" />
                     <Text style={styles.walletText}>₹{walletBalance}</Text>
                  </View>
                </Card>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </Animated.View>

      <Animated.ScrollView 
        style={styles.content}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
      >
        {/* 🎯 TIER PROGRESS CARD */}
        <TierProgressCard />

        {/* 🌌 LIVE COSMIC TICKER */}
        <CosmicTicker />

        {/* 📅 DAILY PANCHANG SNAPSHOT */}
        <PanchangSnapshot />

        {/* ♈ ZODIAC SIGNS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('horoscope.selectSign')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16 }}>
            {zodiacSigns.map(sign => (
              <Card 
                key={sign.id} 
                variant="elevated" 
                padding="none"
                style={styles.zodiacCard}
                onPress={() => router.push(`/(tabs)/horoscope?sign=${encodeURIComponent(sign.id)}` as any)}
              >
                <View style={[styles.zodiacInner, { backgroundColor: sign.color + '08' }]}>
                  <Text style={styles.zodiacEmoji}>{sign.emoji}</Text>
                  <Text style={[styles.zodiacName, { color: sign.color }]}>{sign.name}</Text>
                </View>
              </Card>
            ))}
          </ScrollView>
        </View>

        {/* ⚡ QUICK ACTIONS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.ourServices')}</Text>
          <View style={styles.quickGrid}>
            {quickLinks.map(link => (
              <Card 
                key={link.id} 
                variant="elevated" 
                padding="md"
                style={styles.quickCard}
                onPress={() => router.push(link.route)}
              >
                <View style={[styles.quickIconBox, { backgroundColor: link.color + '15' }]}>
                  <link.icon size={24} color={link.color} />
                </View>
                <Text style={styles.quickText}>{link.title}</Text>
              </Card>
            ))}
          </View>
        </View>

        {/* ⭐ TOP ASTROLOGERS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.topAstrologers')}</Text>
            <Button variant="ghost" title={t('common.seeAll')} size="sm" onPress={() => router.push('/astrologers')} {...createButtonA11yProps('See all astrologers', 'Browse all available astrologers', false)} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16 }}>
            {(loading ? Array(3).fill({ id: 'skeleton' }) : topAstrologers).map((item, index) => (
              <View key={item.id === 'skeleton' ? `skeleton-${index}` : item.id}>
                {item.id === 'skeleton' ? (
                  <SkeletonCard />
                ) : (
                  <AstrologerCard astrologer={item} onPress={(id) => router.push(`/astrologer/${id}`)} />
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
      </FeatureErrorBoundary>
    </View>
  );
}

function createStyles(Colors: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    headerGradientContainer: { zIndex: 10 },
    headerGradient: { borderBottomLeftRadius: 30, borderBottomRightRadius: 30, ...Shadows.medium },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
    greeting: { fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.5, fontFamily: Typography.bold },
    subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '500', fontFamily: Typography.medium },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerIconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)' },
    walletBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
    walletText: { color: '#FFF', fontWeight: '800', fontSize: 15, fontFamily: Typography.bold },
    content: { flex: 1, marginTop: -10 },
    section: { paddingVertical: 20 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, paddingHorizontal: 16, marginBottom: 16, letterSpacing: -0.4, fontFamily: Typography.bold },
    zodiacCard: { width: 100, height: 120, marginRight: 16 },
    zodiacInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    zodiacEmoji: { fontSize: 36, marginBottom: 8 },
    zodiacName: { fontSize: 13, fontWeight: '800', fontFamily: Typography.bold },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
    quickCard: { flex: 1, minWidth: '45%', alignItems: 'center', justifyContent: 'center' },
    quickIconBox: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    quickText: { fontSize: 14, fontWeight: '700', color: Colors.text, fontFamily: Typography.semiBold },
  });
}