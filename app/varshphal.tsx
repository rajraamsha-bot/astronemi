import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Sparkles, Zap, ChevronRight, Info } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '@/contexts/LanguageContext';
import Colors from '@/constants/colors';
import { Card } from '@/components/Card';
import { KundliChartRenderer } from '@/components/kundli/KundliChartRenderer';
import { generateVarshphal, VarshphalResult } from '@/utils/varshphal-engine';
import { Logger } from '@/services/logger';

export default function VarshphalScreen() {
  const insets = useSafeAreaInsets();
  const { natalDataStr } = useLocalSearchParams();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VarshphalResult | null>(null);
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());

  const loadVarshphal = useCallback(async () => {
    setLoading(true);
    try {
      const natalData = JSON.parse(natalDataStr as string);
      const varsh = await generateVarshphal(natalData, targetYear);
      setResult(varsh);
    } catch (e) {
      Logger.error('Error', e);
    } finally {
      setLoading(false);
    }
  }, [natalDataStr, targetYear]);

  useEffect(() => {
    if (natalDataStr) {
      loadVarshphal();
    }
  }, [natalDataStr, targetYear, loadVarshphal]);

  const handleYearChange = (delta: number) => {
    setTargetYear(prev => prev + delta);
  };

  const getVarshphalPlanets = React.useCallback((house: number) => {
    return result?.chartData.planets
      .filter((p) => p.house === house)
      .map((p) => p.name.slice(0, 2)) || [];
  }, [result]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('varshphal.calculating', { year: String(targetYear) })}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FF6B6B', '#6B66FF']} style={styles.header}>
        <View style={[styles.headerContent, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('varshphal.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Year Picker */}
        <View style={styles.yearPicker}>
          <TouchableOpacity onPress={() => handleYearChange(-1)}>
            <ChevronRight size={24} color="#FFF" style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
          <Text style={styles.yearText}>{targetYear}</Text>
          <TouchableOpacity onPress={() => handleYearChange(1)}>
            <ChevronRight size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {result && (
          <>
            <Card style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Sparkles size={20} color={Colors.gold} />
                <Text style={styles.summaryLabel}>{t('varshphal.returnMoment')}</Text>
              </View>
              <Text style={styles.momentText}>
                {result.returnMoment.toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
              <View style={styles.divider} />
              <View style={styles.munthaBox}>
                <View style={styles.munthaIcon}>
                  <Zap size={24} color="#FFF" />
                </View>
                <View>
                  <Text style={styles.munthaLabel}>{t('varshphal.yearlyMuntha')}</Text>
                  <Text style={styles.munthaValue}>{result.munthaSign} ({t('kundli.houses')} {result.chartData.ascendant.signIndex + 1})</Text>
                </View>
              </View>
            </Card>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('varshphal.yearlyThemes')}</Text>
              {result.yearlyThemes.map((theme, idx) => (
                <View key={idx} style={styles.themeItem}>
                  <View style={styles.dot} />
                  <Text style={styles.themeText}>{theme}</Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('varshphal.varshaKundli')}</Text>
              <Card style={styles.chartContainer}>
                <KundliChartRenderer 
                  title={t('kundli.d1Chart')} 
                  centerLabel="Varsh" 
                  subtitle={`Lagna: ${result.chartData.ascendant.sign}`} 
                  getPlanets={getVarshphalPlanets} 
                />
              </Card>
            </View>

            <Card style={styles.infoCard}>
              <Info size={18} color={Colors.primary} />
              <Text style={styles.infoText}>
                {t('varshphal.description')}
              </Text>
            </Card>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666', fontWeight: '600' },
  header: { paddingBottom: 30, elevation: 5 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  backBtn: { padding: 8 },
  yearPicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 20 },
  yearText: { fontSize: 32, fontWeight: '900', color: '#FFF' },
  scrollContent: { padding: 16 },
  summaryCard: { padding: 20, borderRadius: 24, marginBottom: 24 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  summaryLabel: { fontSize: 10, fontWeight: '800', color: '#666', letterSpacing: 1 },
  momentText: { fontSize: 18, fontWeight: '700', color: '#333', lineHeight: 26 },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 16 },
  munthaBox: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  munthaIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#6B66FF', justifyContent: 'center', alignItems: 'center' },
  munthaLabel: { fontSize: 10, fontWeight: '900', color: '#6B66FF', letterSpacing: 1 },
  munthaValue: { fontSize: 18, fontWeight: '800', color: '#333' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#333', marginBottom: 16, paddingHorizontal: 4 },
  themeItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12, backgroundColor: '#FFF', padding: 16, borderRadius: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6B6B', marginTop: 6 },
  themeText: { flex: 1, fontSize: 14, color: '#444', lineHeight: 22 },
  chartContainer: { padding: 10, alignItems: 'center' },
  infoCard: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#F0F3FF', borderRadius: 16 },
  infoText: { flex: 1, fontSize: 12, color: '#4B3F72', lineHeight: 18 }
});
