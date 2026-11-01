/**
 * Kundli Screen - Fully Decomposed
 * Birth chart generation and display using extracted components
 * 
 * All visual sections are extracted to components/kundli/*
 * This orchestrator file handles state, validation, and layout only.
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, Share2, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';
import { AstrologyDisclaimer } from '@/components/AstrologyDisclaimer';
import { useAppTheme, AppTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { generateKundli, KundliData } from '@/utils/kundli-generator';
import { hasFeatureAccess } from '@/services/subscription';
import { exportReportAsHTML } from '@/utils/report-generator';
import { tapMedium, notifySuccess, notifyWarning } from '@/utils/haptics';
import { useLanguage } from '@/contexts/LanguageContext';

// Extracted sub-components (each <150 lines)
import { KundliFormInput } from '@/components/kundli/KundliFormInput';
import { KundliProfileCard } from '@/components/kundli/KundliProfileCard';
import { KundliPlanetaryPositions } from '@/components/kundli/KundliPlanetaryPositions';
import { KundliNakshatraDetails } from '@/components/kundli/KundliNakshatraDetails';
import { KundliYogasDisplay } from '@/components/kundli/KundliYogasDisplay';
import { KundliDashaDisplay } from '@/components/kundli/KundliDashaDisplay';
import { KundliCharaKarakas } from '@/components/kundli/KundliCharaKarakas';
import { KundliArudhaPadas } from '@/components/kundli/KundliArudhaPadas';
import { KundliInsights } from '@/components/kundli/KundliInsights';
import { KundliSyntheticReading } from '@/components/kundli/KundliSyntheticReading';
import { KundliGemstones } from '@/components/kundli/KundliGemstones';
import { KundliGochar } from '@/components/kundli/KundliGochar';
import { KundliSacredRemedies } from '@/components/kundli/KundliSacredRemedies';
import { DailyMuhurat } from '@/components/kundli/DailyMuhurat';
import { DashaTimeline } from '@/components/kundli/DashaTimeline';
import { KundliSadeSati } from '@/components/kundli/KundliSadeSati';
import { ViralChartCard } from '@/components/kundli/ViralChartCard';
import { shareViewAsImage } from '@/utils/share-utility';
import { getSyntheticAstrologyReading } from '@/utils/ai-synthesis';
import { AI_FEATURES_ENABLED } from '@/config/ai-features';
import { ShadbalaStrengthWidget } from '@/components/kundli/ShadbalaStrengthWidget';
import { DivisionalChartExplorer } from '@/components/kundli/DivisionalChartExplorer';

// ─── Utility Functions ────────────────────────────────────────────

const formatDateInput = (text: string, _prev: string): string => {
  const digits = text.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
};

const formatTimeInput = (text: string): string => {
  const digits = text.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
};

const validateDate = (date: string): { valid: boolean; error?: string } => {
  const parts = date.split('/');
  if (parts.length !== 3 || (parts[2]?.length ?? 0) !== 4)
    return { valid: false, error: 'Use DD/MM/YYYY format' };
  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);
  if (day < 1 || day > 31) return { valid: false, error: 'Day must be 1-31' };
  if (month < 1 || month > 12) return { valid: false, error: 'Month must be 1-12' };
  if (year < 1900 || year > new Date().getFullYear())
    return { valid: false, error: 'Invalid year' };
  return { valid: true };
};

const validateTime = (time: string): { valid: boolean; error?: string } => {
  const parts = time.split(':');
  if (parts.length !== 2) return { valid: false, error: 'Use HH:MM format' };
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (hour < 0 || hour > 23) return { valid: false, error: 'Hour must be 0-23' };
  if (minute < 0 || minute > 59) return { valid: false, error: 'Minute must be 0-59' };
  return { valid: true };
};

// ─── Main Screen ──────────────────────────────────────────────────

function KundliScreenInner() {
  const Colors = useAppTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { currentSubscription } = useUser();

  // State
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [kundliData, setKundliData] = useState<KundliData | null>(null);
  const [loading, setLoading] = useState(false);
  const [syntheticReading, setSyntheticReading] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Refs

  const shareCardRef = useRef<View>(null);

  // Handlers
  const handleDateChange = useCallback(
    (text: string) => {
      setBirthDate(formatDateInput(text, birthDate));
      setErrors((e) => ({ ...e, birthDate: '' }));
    },
    [birthDate]
  );

  const handleTimeChange = useCallback((text: string) => {
    setBirthTime(formatTimeInput(text));
    setErrors((e) => ({ ...e, birthTime: '' }));
  }, []);

  const handleGenerate = useCallback(async () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = t('kundli.namePlaceholder');
    }
    const dateValidation = validateDate(birthDate);
    if (!dateValidation.valid) {
      newErrors.birthDate = dateValidation.error || t('common.error');
    }
    const timeValidation = validateTime(birthTime);
    if (!timeValidation.valid) {
      newErrors.birthTime = timeValidation.error || t('common.error');
    }
    if (!birthPlace.trim() || birthPlace.trim().length < 2) {
      newErrors.birthPlace = t('kundli.birthPlacePlaceholder');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const userTier = currentSubscription?.plan || 'free';
    const precisionLevel = hasFeatureAccess(userTier, 'professional_accuracy') 
      ? 'professional' 
      : 'standard';

    setLoading(true);
    await tapMedium();
    try {
      const data = await generateKundli(name.trim(), birthDate, birthTime, birthPlace.trim(), precisionLevel);
      setKundliData(data);
      await notifySuccess();
    } catch {
      Alert.alert(t('common.error'), t('common.unableToLoad'));
    } finally {
      setLoading(false);
    }
  }, [name, birthDate, birthTime, birthPlace, currentSubscription, t]);

  const handleReset = useCallback(() => {
    setKundliData(null);
    setSyntheticReading(null);
  }, []);

  const handleGenerateAISynthesis = useCallback(async () => {
    if (!kundliData) return;
    
    setIsGeneratingAI(true);
    try {
      const reading = await getSyntheticAstrologyReading(kundliData);
      setSyntheticReading(reading);
    } catch {
      Alert.alert(t('common.error'), t('common.unableToLoad'));
    } finally {
      setIsGeneratingAI(false);
    }
  }, [kundliData, t]);

  const handleUpgrade = useCallback(() => {
    tapMedium();
    router.push('/subscription');
  }, []);

  const handleShare = useCallback(async () => {
    if (shareCardRef.current) {
      await shareViewAsImage(shareCardRef.current as unknown as React.RefObject<unknown>, 'AstroNemi_Synergy');
    }
  }, [shareCardRef]);

  const navigateToVarshphal = useCallback(() => {
    if (!kundliData) return;
    if (!hasFeatureAccess(currentSubscription?.plan || 'free', 'soulmate_synthesis')) {
      handleUpgrade();
      return;
    }
    router.push(`/varshphal?natalDataStr=${encodeURIComponent(JSON.stringify(kundliData))}`);
  }, [kundliData, currentSubscription, handleUpgrade]);

  const handleDownloadReport = useCallback(async () => {
    if (!kundliData) return;

    const userPlan = currentSubscription?.plan || 'free';
    if (userPlan === 'free' || userPlan === 'basic') {
      await notifyWarning();
      Alert.alert(
        '💎 Premium Feature',
        'Detailed PDF report downloads are only available for Premium and Gold members.\n\nWould you like to upgrade now?',
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('home.viewPlans'), onPress: () => router.push('/subscription') },
        ]
      );
      return;
    }

    setExporting(true);
    try {
      const result = await exportReportAsHTML(kundliData);
      if (!result.success) {
        Alert.alert(t('common.error'), result.error || t('common.unableToLoad'));
      }
    } catch {
      Alert.alert(t('common.error'), t('common.unableToLoad'));
    } finally {
      setExporting(false);
    }
  }, [kundliData, currentSubscription, t]);


  // ─── Loading State ──────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{t('kundli.generating')}</Text>
          <Text style={styles.loadingSubtext}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Results View ───────────────────────────────────────────────

  if (kundliData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('kundli.title')}</Text>
          <TouchableOpacity
            onPress={handleReset}
            accessibilityLabel={t('kundli.generateKundli')}
            accessibilityHint="Go back to generate a new birth chart"
            accessibilityRole="button"
          >
            <Text style={styles.backText}>← {t('kundli.generateKundli')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.resultContainer}>
            {/* Profile Card */}
            <KundliProfileCard kundliData={kundliData} />

            <AstrologyDisclaimer context="kundli" />

            {/* Daily High-Retention Widget */}
            <DailyMuhurat 
              location={{
                lat: kundliData.personalInfo?.location?.latitude || 0,
                lng: kundliData.personalInfo?.location?.longitude || 0
              }}
              isLocked={!hasFeatureAccess(currentSubscription?.plan || 'free', 'sade_sati_detail')}
              onUpgrade={handleUpgrade}
            />

            {/* AI Guru Reading — code kept, hidden in AI-off builds */}
            {AI_FEATURES_ENABLED && (
              <KundliSyntheticReading
                reading={syntheticReading}
                isGenerating={isGeneratingAI}
                onGenerate={handleGenerateAISynthesis}
                isLocked={!hasFeatureAccess(currentSubscription?.plan || 'free', 'ai_guru_insights')}
                onUpgrade={handleUpgrade}
              />
            )}

            {/* Professional Gemstones */}
            <KundliGemstones
              recommendations={kundliData.gemstones}
              isLocked={!hasFeatureAccess(currentSubscription?.plan || 'free', 'gemstone_recommendations')}
              onUpgrade={handleUpgrade}
            />

            {/* Elite Sacred Remedies & Ishta Devta */}
            <KundliSacredRemedies
              data={kundliData}
              isLocked={!hasFeatureAccess(currentSubscription?.plan || 'free', 'soulmate_synthesis')} // Gold gated
              onUpgrade={handleUpgrade}
            />

            {/* Live Transit Dashboard */}
            <KundliGochar
              transits={kundliData.transits}
              isLocked={!hasFeatureAccess(currentSubscription?.plan || 'free', 'transit_dashboard')}
              onUpgrade={handleUpgrade}
            />

            {/* Visual Dasha Timeline */}
            <DashaTimeline 
              dashas={kundliData.vimshottariDasha}
              isLocked={!hasFeatureAccess(currentSubscription?.plan || 'free', 'dasha_depth')}
              onUpgrade={handleUpgrade}
            />



            {/* Professional Sade Sati Analysis */}
            <KundliSadeSati 
              analysis={kundliData.sadeSati}
              isLocked={!hasFeatureAccess(currentSubscription?.plan || 'free', 'sade_sati_detail')}
              onUpgrade={handleUpgrade}
            />

            {/* Varshphal / Yearly Report Promotion */}
            <TouchableOpacity onPress={navigateToVarshphal}>
              <LinearGradient colors={['#FF6B6B', '#FFD93D']} style={styles.elitePlusCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.elitePlusLabel}>NEW EXCLUSIVE</Text>
                  <Text style={styles.elitePlusTitle}>Your &quot;Solar Return&quot; Report</Text>
                  <Text style={styles.elitePlusDesc}>Deep insights into your personal theme for {new Date().getFullYear()}.</Text>
                </View>
                <View style={styles.elitePlusIcon}>
                  <Calendar size={24} color="#FFF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Premium Shadbala Analysis */}
            <ShadbalaStrengthWidget 
              shadbala={kundliData.shadbala || []} 
              isLocked={!hasFeatureAccess(currentSubscription?.plan || 'free', 'ai_guru_insights')}
              onUpgrade={handleUpgrade}
            />

            {/* Advanced Divisional Chart Explorer (D1 to D30) */}
            <DivisionalChartExplorer 
              data={{
                d1Planets: kundliData.planets,
                d2Chart: kundliData.d2Chart,
                d3Chart: kundliData.d3Chart,
                d7Chart: kundliData.d7Chart,
                d9Chart: kundliData.d9Chart,
                d12Chart: kundliData.d12Chart,
                d30Chart: kundliData.d30Chart,
              }}
              isLocked={!hasFeatureAccess(currentSubscription?.plan || 'free', 'professional_accuracy')}
              onUpgrade={handleUpgrade}
            />

            {/* Planetary Positions */}
            <KundliPlanetaryPositions planets={kundliData.planets} />

            {/* Nakshatra Details */}
            <KundliNakshatraDetails planets={kundliData.planets} />

            {/* Chara Karakas (Jaimini) */}
            <KundliCharaKarakas charaKarakas={kundliData.charaKarakas} />

            {/* Arudha Padas + Upapada Lagna */}
            <KundliArudhaPadas
              arudhaPadas={kundliData.arudhaPadas}
              upapadaLagna={kundliData.upapadaLagna}
            />

            {/* Yogas (Parashari + Jaimini) */}
            <KundliYogasDisplay
              parasharYogas={kundliData.parasharYogas}
              jaiminiYogas={kundliData.jaiminiYogas}
            />

            {/* Mangal Dosha + Key Insights */}
            <KundliInsights
              insights={kundliData.insights}
              mangalDosha={kundliData.mangalDosha}
            />

            {/* Dasha (Vimshottari + Chara) */}
            <KundliDashaDisplay
              vimshottariDasha={kundliData.vimshottariDasha}
              charaDasha={kundliData.charaDasha}
            />

            {/* Download Report */}
            <TouchableOpacity
              style={[styles.downloadButton, exporting && styles.downloadButtonDisabled]}
              onPress={handleDownloadReport}
              disabled={exporting}
              accessibilityLabel={t('kundli.downloadPdf')}
              accessibilityHint="Download your complete Kundli report as an HTML file"
              accessibilityRole="button"
            >
              {exporting ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <FileText size={20} color={Colors.primary} />
                  <Text style={styles.downloadButtonText}>{t('kundli.downloadPdf')}</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Consult CTA */}
            <TouchableOpacity
              style={styles.consultButton}
              onPress={() => router.push('/astrologers')}
              accessibilityLabel={t('astrologers.title')}
              accessibilityHint="Browse available astrologers for personalized Kundli interpretation"
              accessibilityRole="button"
            >
              <Text style={styles.consultButtonText}>
                {t('astrologers.title')}
              </Text>
            </TouchableOpacity>

            {/* Hidden Viral Card for Capturing */}
            <View style={{ position: 'absolute', left: -2000 }}>
              <View ref={shareCardRef} collapsable={false}>
                <ViralChartCard data={kundliData} />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Floating Share Button */}
        <TouchableOpacity 
          style={styles.floatingShare} 
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <LinearGradient colors={['#9C27B0', '#E91E63']} style={styles.shareGradient}>
            <Share2 size={24} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── Form View ──────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('kundli.title')}</Text>
        <Text style={styles.headerSubtitle} numberOfLines={1}>
          {t('kundli.subtitle')}
        </Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <KundliFormInput
          name={name}
          birthDate={birthDate}
          birthTime={birthTime}
          birthPlace={birthPlace}
          errors={errors}
          onNameChange={(t) => { setName(t); setErrors((e) => ({ ...e, name: '' })); }}
          onDateChange={handleDateChange}
          onTimeChange={handleTimeChange}
          onPlaceChange={(t) => { setBirthPlace(t); setErrors((e) => ({ ...e, birthPlace: '' })); }}
          onGenerate={handleGenerate}
          loading={loading}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const createStyles = (Colors: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    loadingText: {
      fontSize: 16,
      fontWeight: '600',
      color: Colors.text,
      marginTop: 16,
    },
    loadingSubtext: {
      fontSize: 13,
      color: Colors.textLight,
      marginTop: 8,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      backgroundColor: Colors.primary,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: Colors.white,
    },
    headerSubtitle: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.9)',
      fontWeight: '500',
    },
    backText: {
      fontSize: 14,
      fontWeight: '600',
      color: Colors.white,
    },
    resultContainer: {
      padding: 16,
    },
    downloadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 16,
      marginTop: 10,
      backgroundColor: Colors.white,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: Colors.primary,
    },
    downloadButtonDisabled: {
      opacity: 0.6,
    },
    downloadButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: Colors.primary,
    },
    consultButton: {
      paddingVertical: 16,
      marginTop: 12,
      marginBottom: 40,
      backgroundColor: Colors.primary,
      borderRadius: 16,
      alignItems: 'center',
    },
    consultButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: Colors.white,
    },
    elitePlusCard: {
      marginHorizontal: 16,
      marginBottom: 24,
      padding: 20,
      borderRadius: 24,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 10,
    },
    elitePlusLabel: {
      fontSize: 10,
      fontWeight: '900',
      color: '#FFF',
      opacity: 0.8,
      letterSpacing: 1,
    },
    elitePlusTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#FFF',
      marginVertical: 4,
    },
    elitePlusDesc: {
      fontSize: 12,
      color: '#FFF',
      opacity: 0.9,
    },
    elitePlusIcon: {
      width: 50,
      height: 50,
      borderRadius: 15,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    floatingShare: {
      position: 'absolute',
      right: 20,
      bottom: 40,
      elevation: 8,
      shadowColor: '#9C27B0',
      shadowOpacity: 0.4,
      shadowRadius: 10,
    },
    shareGradient: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

export default function KundliScreen() {
  return (
    <FeatureErrorBoundary featureName="Kundli">
      <KundliScreenInner />
    </FeatureErrorBoundary>
  );
}
