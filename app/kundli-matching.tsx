import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Heart, ArrowLeft, Sparkles, Info,
  Lock, Flame, Share2
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@/contexts/UserContext';
import { Card } from '@/components/Card';
import { useLanguage } from '@/contexts/LanguageContext';
import { generateKundli } from '@/utils/kundli-generator';
import { calculateProfessionalMatch, CompatibilityResult } from '@/utils/compatibility-engine';
import { getSoulmateSynthesis } from '@/utils/ai-synthesis';
import { AI_FEATURES_ENABLED } from '@/config/ai-features';
import { tapMedium, tapHeavy, notifySuccess } from '@/utils/haptics';
import { hasFeatureAccess } from '@/services/subscription';
import { Logger } from '@/services/logger';

const { width } = Dimensions.get('window');

interface PersonDetails {
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
}

export default function KundliMatchingScreen() {
  const { currentSubscription } = useUser();
  const { t } = useLanguage();
  const styles = React.useMemo(() => createStyles(), []);

  const [boyDetails, setBoyDetails] = useState<PersonDetails>({ name: '', birthDate: '', birthTime: '', birthPlace: '' });
  const [girlDetails, setGirlDetails] = useState<PersonDetails>({ name: '', birthDate: '', birthTime: '', birthPlace: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [soulmateReading, setSoulmateReading] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const isFormValid = () =>
    boyDetails.name && boyDetails.birthDate && boyDetails.birthTime && boyDetails.birthPlace &&
    girlDetails.name && girlDetails.birthDate && girlDetails.birthTime && girlDetails.birthPlace;

  const handleGenerateMatch = async () => {
    setLoading(true);
    await tapHeavy();
    try {
      // 1. Generate Kundlis for both (Standard precision is enough for Gunas/Manglik)
      const boyKundli = await generateKundli(boyDetails.name, boyDetails.birthDate, boyDetails.birthTime, boyDetails.birthPlace);
      const girlKundli = await generateKundli(girlDetails.name, girlDetails.birthDate, girlDetails.birthTime, girlDetails.birthPlace);

      // 2. Calculate Professional Match
      const match = await calculateProfessionalMatch(boyKundli, girlKundli);
      setResult(match);
      await notifySuccess();
    } catch (e) {
      Logger.error('Error', e);
      Alert.alert(t('common.error'), t('common.unableToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAIReading = async () => {
    if (!result) return;
    
    if (!hasFeatureAccess(currentSubscription?.plan || 'free', 'soulmate_synthesis')) {
      tapMedium();
      router.push('/subscription');
      return;
    }

    setIsGeneratingAI(true);
    await tapMedium();
    try {
      const reading = await getSoulmateSynthesis(boyDetails.name, girlDetails.name, result);
      setSoulmateReading(reading);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const renderGunaMilan = () => {
    if (!result) return null;
    return (
      <View style={styles.gunaSection}>
        <Text style={styles.sectionTitle}>{t('matching.gunaMilan')}</Text>
        {result.gunas.map((guna: { name: string; points: number; maxPoints: number; status: string; description?: string }, index: number) => (
          <View key={index} style={styles.gunaRow}>
            <View style={styles.gunaLabelRow}>
              <Text style={styles.gunaName}>{guna.name}</Text>
              <Text style={styles.gunaPoints}>{guna.points}/{guna.maxPoints}</Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${(guna.points / guna.maxPoints) * 100}%`, backgroundColor: guna.status === 'good' ? '#4CAF50' : '#FF9800' }]} />
            </View>
            <Text style={styles.gunaDesc}>{guna.description}</Text>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#E91E63" />
        <Text style={styles.loadingTitle}>{t('matching.analyzingSynergy')}</Text>
        <Text style={styles.loadingSubtitle}>{t('matching.subtitle')}</Text>
      </View>
    );
  }

  if (result) {
    const isManglikLocked = !hasFeatureAccess(currentSubscription?.plan || 'free', 'manglik_analysis');
    const isAILocked = !hasFeatureAccess(currentSubscription?.plan || 'free', 'soulmate_synthesis');

    return (
      <View style={styles.container}>
        <LinearGradient colors={['#E91E63', '#9C27B0']} style={styles.resultHeader}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerNav}>
              <TouchableOpacity onPress={() => setResult(null)} style={styles.iconBtn}>
                <ArrowLeft size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitleLight}>{t('matching.soulmateSynergy')}</Text>
              <TouchableOpacity style={styles.iconBtn}>
                <Share2 size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.scoreContainer}>
              <View style={styles.synergyCircle}>
                <Text style={styles.synergyPercent}>{result.synergyScore}%</Text>
                <Text style={styles.synergyLabel}>{t('matching.matchScore')}</Text>
              </View>
              <Text style={styles.recommendationText}>{result.recommendation}</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <ScrollView style={styles.resultContent} showsVerticalScrollIndicator={false}>
          {/* Partner Quick View */}
          <View style={styles.partnerSummary}>
            <View style={styles.partnerCard}>
              <Text style={styles.partnerInit}>{boyDetails.name[0]}</Text>
              <Text style={styles.partnerName} numberOfLines={1}>{boyDetails.name}</Text>
              <View style={[styles.genderBadge, { backgroundColor: '#BBDEFB' }]}>
                <Text style={{ color: '#1976D2', fontWeight: 'bold', fontSize: 10 }}>{t('matching.groom').toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.heartConnector}>
              <Heart size={24} color="#E91E63" fill="#E91E63" />
              <View style={styles.connectorLine} />
            </View>
            <View style={styles.partnerCard}>
              <Text style={styles.partnerInit}>{girlDetails.name[0]}</Text>
              <Text style={styles.partnerName} numberOfLines={1}>{girlDetails.name}</Text>
              <View style={[styles.genderBadge, { backgroundColor: '#F8BBD0' }]}>
                <Text style={{ color: '#C2185B', fontWeight: 'bold', fontSize: 10 }}>{t('matching.bride').toUpperCase()}</Text>
              </View>
            </View>
          </View>

          {/* Manglik Analysis - Premium Gated */}
          <Card style={styles.professionalCard}>
            <View style={styles.cardHeader}>
              <Flame size={20} color="#FF5722" />
              <Text style={styles.cardTitle}>Mangal Dosha</Text>
              {isManglikLocked && <Lock size={14} color="#999" />}
            </View>

            {isManglikLocked ? (
              <View style={styles.lockedOverlap}>
                <Text style={styles.lockedText}>Unlock to see Mangal Dosha analysis.</Text>
                <TouchableOpacity style={styles.unlockBtn} onPress={() => router.push('/subscription')}>
                  <Text style={styles.unlockBtnText}>Unlock Analysis</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.manglikContent}>
                <View style={styles.manglikRow}>
                  <Text style={styles.manglikName}>{boyDetails.name}:</Text>
                  <Text style={[styles.manglikStatus, { color: result.boyManglik.isManglik ? '#F44336' : '#4CAF50' }]}>
                    {result.boyManglik.isManglik ? `Manglik` : 'Non-Manglik'}
                  </Text>
                </View>
                <View style={styles.manglikRow}>
                  <Text style={styles.manglikName}>{girlDetails.name}:</Text>
                  <Text style={[styles.manglikStatus, { color: result.girlManglik.isManglik ? '#F44336' : '#4CAF50' }]}>
                    {result.girlManglik.isManglik ? `Manglik` : 'Non-Manglik'}
                  </Text>
                </View>
                <View style={styles.expertInsightBox}>
                  <Info size={16} color="#9C27B0" />
                  <Text style={styles.expertInsightText}>{result.expertAdvice}</Text>
                </View>
              </View>
            )}
          </Card>

          {/* AI Guru Soulmate Synthesis - hidden in AI-off builds */}
          {AI_FEATURES_ENABLED && (
            <Card style={styles.professionalCard}>
              <View style={[styles.goldCard, styles.cardHeader]}>
                <Sparkles size={20} color="#FFD700" />
                <Text style={[styles.cardTitle, { color: '#886600' }]}>Divine Soulmate Reading</Text>
              </View>

              {soulmateReading ? (
                <Text style={styles.readingText}>{soulmateReading}</Text>
              ) : (
                <View>
                  <Text style={styles.readingTeaser}>Is it a karmic bond or a spiritual union? Our AI Guru analyzes your synastry.</Text>
                  <TouchableOpacity
                    style={[styles.aiBtn, isAILocked && styles.aiBtnLocked]}
                    onPress={handleGenerateAIReading}
                    disabled={isGeneratingAI}
                  >
                    {isGeneratingAI ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <>
                        {isAILocked && <Lock size={16} color="#FFF" />}
                        <Text style={styles.aiBtnText}>{isAILocked ? 'Unlock Guru Reading' : 'Generate Guru Reading'}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          )}

          {/* Detailed Gunas */}
          {renderGunaMilan()}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#9C27B0', '#E91E63']} style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <ArrowLeft size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitleLarge}>Matchmaking</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.headerSubtitle}>Discover Your Soulmate Synergy</Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
        <Card style={styles.inputCard}>
          <View style={styles.genderTitleRow}>
            <View style={[styles.genderDot, { backgroundColor: '#2196F3' }]} />
            <Text style={styles.genderTitle}>{t('matching.boyDetails')}</Text>
          </View>
          <TextInput 
            style={styles.input} 
            placeholder={t('kundli.name')} 
            value={boyDetails.name}
            onChangeText={t => setBoyDetails({...boyDetails, name: t})}
          />
          <View style={styles.inputRow}>
            <TextInput style={[styles.input, { flex: 1.5 }]} placeholder={t('kundli.birthDatePlaceholder')} value={boyDetails.birthDate} onChangeText={t => setBoyDetails({...boyDetails, birthDate: t})} />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder={t('kundli.birthTimePlaceholder')} value={boyDetails.birthTime} onChangeText={t => setBoyDetails({...boyDetails, birthTime: t})} />
          </View>
          <TextInput style={styles.input} placeholder={t('kundli.birthPlacePlaceholder')} value={boyDetails.birthPlace} onChangeText={t => setBoyDetails({...boyDetails, birthPlace: t})} />
        </Card>

        <Card style={styles.inputCard}>
          <View style={styles.genderTitleRow}>
            <View style={[styles.genderDot, { backgroundColor: '#E91E63' }]} />
            <Text style={styles.genderTitle}>{t('matching.girlDetails')}</Text>
          </View>
          <TextInput 
            style={styles.input} 
            placeholder={t('kundli.name')} 
            value={girlDetails.name}
            onChangeText={t => setGirlDetails({...girlDetails, name: t})}
          />
          <View style={styles.inputRow}>
            <TextInput style={[styles.input, { flex: 1.5 }]} placeholder={t('kundli.birthDatePlaceholder')} value={girlDetails.birthDate} onChangeText={t => setGirlDetails({...girlDetails, birthDate: t})} />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder={t('kundli.birthTimePlaceholder')} value={girlDetails.birthTime} onChangeText={t => setGirlDetails({...girlDetails, birthTime: t})} />
          </View>
          <TextInput style={styles.input} placeholder={t('kundli.birthPlacePlaceholder')} value={girlDetails.birthPlace} onChangeText={t => setGirlDetails({...girlDetails, birthPlace: t})} />
        </Card>

        <TouchableOpacity 
          style={[styles.matchBtn, !isFormValid() && styles.matchBtnDisabled]} 
          onPress={handleGenerateMatch}
          disabled={!isFormValid()}
        >
          <LinearGradient colors={['#E91E63', '#FF4081']} style={styles.matchBtnGradient}>
            <Heart size={20} color="#FFF" fill="#FFF" />
            <Text style={styles.matchBtnText}>{t('matching.calculateSynergy')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    centerContent: { justifyContent: 'center', alignItems: 'center', padding: 40 },
    headerGradient: { paddingBottom: 24 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    iconBtn: { padding: 8 },
    headerTitleLarge: { fontSize: 24, fontWeight: '800', color: '#FFF' },
    headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 4 },
    formContainer: { padding: 16 },
    inputCard: { padding: 20, marginBottom: 16, borderRadius: 24 },
    genderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    genderDot: { width: 8, height: 8, borderRadius: 4 },
    genderTitle: { fontSize: 16, fontWeight: '800', color: '#333' },
    input: { backgroundColor: '#F5F5F5', borderRadius: 16, padding: 16, fontSize: 16, color: '#333', marginBottom: 12 },
    inputRow: { flexDirection: 'row', gap: 12 },
    matchBtn: { marginTop: 8, borderRadius: 20, overflow: 'hidden', elevation: 4, shadowColor: '#E91E63', shadowOpacity: 0.3, shadowRadius: 10 },
    matchBtnDisabled: { opacity: 0.6 },
    matchBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 10 },
    matchBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    
    loadingTitle: { fontSize: 20, fontWeight: '800', color: '#333', marginTop: 24 },
    loadingSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8 },

    resultHeader: { paddingBottom: 40 },
    headerNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    headerTitleLight: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    scoreContainer: { alignItems: 'center', marginTop: 20 },
    synergyCircle: { 
      width: 140, height: 140, borderRadius: 70, 
      backgroundColor: 'rgba(255,255,255,0.2)', 
      borderWidth: 6, borderColor: '#FFF',
      justifyContent: 'center', alignItems: 'center'
    },
    synergyPercent: { fontSize: 42, fontWeight: '900', color: '#FFF' },
    synergyLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' },
    recommendationText: { fontSize: 16, fontWeight: '700', color: '#FFF', marginTop: 16, textAlign: 'center', paddingHorizontal: 40 },

    resultContent: { flex: 1, marginTop: -30, backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 },
    partnerSummary: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 24, paddingTop: 10 },
    partnerCard: { alignItems: 'center', width: width * 0.3 },
    partnerInit: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0F0F0', textAlign: 'center', lineHeight: 50, fontSize: 20, fontWeight: '800', color: '#333' },
    partnerName: { fontSize: 14, fontWeight: '700', color: '#333', marginTop: 8 },
    genderBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
    heartConnector: { alignItems: 'center' },
    connectorLine: { width: 2, height: 20, backgroundColor: '#EEE', marginTop: 4 },

    professionalCard: { padding: 20, marginBottom: 20, borderRadius: 24 },
    goldCard: { backgroundColor: '#FFFDF0', borderColor: '#F0E0AA', borderWidth: 1 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: '#333', flex: 1 },
    lockedOverlap: { alignItems: 'center', paddingTop: 10 },
    lockedText: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
    unlockBtn: { backgroundColor: '#333', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 },
    unlockBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    manglikContent: { paddingTop: 8 },
    manglikRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    manglikName: { fontSize: 14, color: '#666' },
    manglikStatus: { fontSize: 14, fontWeight: '700' },
    expertInsightBox: { flexDirection: 'row', gap: 10, backgroundColor: '#F5F0FF', padding: 12, borderRadius: 16, marginTop: 12 },
    expertInsightText: { flex: 1, fontSize: 13, color: '#666', lineHeight: 18 },
    readingTeaser: { fontSize: 13, color: '#887755', fontStyle: 'italic', textAlign: 'center', lineHeight: 18, marginBottom: 20 },
    readingText: { fontSize: 14, color: '#554422', lineHeight: 22 },
    aiBtn: { backgroundColor: '#886600', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    aiBtnLocked: { backgroundColor: '#444' },
    aiBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },

    gunaSection: { paddingTop: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#333', marginBottom: 20 },
    gunaRow: { marginBottom: 16 },
    gunaLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    gunaName: { fontSize: 15, fontWeight: '700', color: '#333' },
    gunaPoints: { fontSize: 14, fontWeight: '800', color: '#E91E63' },
    progressContainer: { height: 6, backgroundColor: '#EEE', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
    progressBar: { height: '100%', borderRadius: 3 },
    gunaDesc: { fontSize: 12, color: '#999', lineHeight: 18 }
  });
}
