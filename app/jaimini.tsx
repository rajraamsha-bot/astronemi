/**
 * Jaimini screen — reads real Chara Karakas, Chara Dasha, Arudha Padas,
 * Upapada Lagna and Jaimini yogas from the generated kundli. Prompts for
 * birth details when the chart isn't available yet.
 */

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ChevronDown, ChevronUp, Info, Star } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import type {
  ArudhaPada,
  CharaDashaPeriod,
  CharaKaraka,
  JaiminiYoga,
  UpapadaResult,
} from '@/utils/kundli-generator';
import { useKundliData } from '@/hooks/useKundliData';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';

const SIGN_COLORS: Record<string, string> = {
  Aries: '#F44336',
  Taurus: '#4CAF50',
  Gemini: '#FFEB3B',
  Cancer: '#2196F3',
  Leo: '#FF9800',
  Virgo: '#8BC34A',
  Libra: '#9C27B0',
  Scorpio: '#795548',
  Sagittarius: '#00BCD4',
  Capricorn: '#607D8B',
  Aquarius: '#3F51B5',
  Pisces: '#E91E63',
};

const SIGN_ELEMENTS: Record<string, 'Fire' | 'Earth' | 'Air' | 'Water'> = {
  Aries: 'Fire', Leo: 'Fire', Sagittarius: 'Fire',
  Taurus: 'Earth', Virgo: 'Earth', Capricorn: 'Earth',
  Gemini: 'Air', Libra: 'Air', Aquarius: 'Air',
  Cancer: 'Water', Scorpio: 'Water', Pisces: 'Water',
};

function formatYears(years: number): string {
  if (years >= 1) return `${Math.round(years)} yrs`;
  return `${Math.round(years * 12)} mo`;
}

function yearsFromBirth(start: Date, birth: Date): number {
  return Math.max(0, (start.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

// ─── Screen ──────────────────────────────────────────────────────────────────

function JaiminiScreenInner() {
  const { data: kundli, isLoading, error, noBirthDetails, birthDetails } = useKundliData();
  const [showDasha, setShowDasha] = useState(true);
  const [showKarakas, setShowKarakas] = useState(true);
  const [showArudha, setShowArudha] = useState(false);
  const [showYogas, setShowYogas] = useState(true);
  const [selectedDasha, setSelectedDasha] = useState<string | null>(null);

  const birthDateObj = useMemo(() => {
    if (!birthDetails) return null;
    const parts = birthDetails.birthDate.split('/');
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts.map(Number);
    if (!dd || !mm || !yyyy) return null;
    return new Date(yyyy, mm - 1, dd);
  }, [birthDetails]);

  const karakas: CharaKaraka[] = kundli?.charaKarakas ?? [];
  const charaDasha: CharaDashaPeriod[] = kundli?.charaDasha ?? [];
  const arudhaPadas: ArudhaPada[] = kundli?.arudhaPadas ?? [];
  const upapada: UpapadaResult | undefined = kundli?.upapadaLagna;
  const yogas: JaiminiYoga[] = kundli?.jaiminiYogas ?? [];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#BF360C', '#E64A19', '#F4511E']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color="#FFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Jaimini Astrology</Text>
            <View style={styles.infoButton}>
              <Info color="#FFF" size={22} />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Star color="#FF9800" size={20} />
            <Text style={styles.infoCardTitle}>What is Jaimini Astrology?</Text>
          </View>
          <Text style={styles.infoCardText}>
            Jaimini is a parallel Vedic tradition that uses sign-based dashas
            (Chara Dasha) and degree-based planetary significators (Chara
            Karakas) for prediction. Your Atmakaraka reveals your soul purpose.
          </Text>
        </View>

        {noBirthDetails && <NoBirthDetailsPrompt />}
        {isLoading && <LoadingState />}
        {error && !noBirthDetails && (
          <ErrorState message="Couldn't compute Jaimini data. Check your birth details." />
        )}

        {kundli && (
          <>
            {/* Chara Karakas */}
            <View style={styles.section}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => setShowKarakas(v => !v)}>
                <Text style={styles.sectionTitle}>Chara Karakas</Text>
                {showKarakas ? (
                  <ChevronUp color={Colors.text} size={20} />
                ) : (
                  <ChevronDown color={Colors.text} size={20} />
                )}
              </TouchableOpacity>
              {showKarakas && (
                <View style={styles.karakasContainer}>
                  <Text style={styles.karakasIntro}>
                    Planets ranked by their degree within sign (highest = Atmakaraka):
                  </Text>
                  {karakas.length === 0 ? (
                    <Text style={styles.emptyHint}>No karaka data available.</Text>
                  ) : (
                    karakas.map(k => (
                      <View key={k.karaka} style={styles.karakaCard}>
                        <View style={styles.karakaHeader}>
                          <View style={styles.karakaName}>
                            <Text style={styles.karakaTitle}>
                              {k.karaka} ({k.karakaShort})
                            </Text>
                            <Text style={styles.karakaPlanet}>{k.planet}</Text>
                          </View>
                          <Text style={styles.karakaDegree}>{k.degree.toFixed(2)}°</Text>
                        </View>
                        <Text style={styles.karakaSignificance}>{k.description}</Text>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>

            {/* Chara Dasha */}
            <View style={styles.section}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => setShowDasha(v => !v)}>
                <Text style={styles.sectionTitle}>Chara Dasha</Text>
                {showDasha ? (
                  <ChevronUp color={Colors.text} size={20} />
                ) : (
                  <ChevronDown color={Colors.text} size={20} />
                )}
              </TouchableOpacity>
              {showDasha && (
                <View style={styles.dashaContainer}>
                  <View style={styles.dashaHeader}>
                    <Text style={styles.dashaHeaderText}>Sign</Text>
                    <Text style={styles.dashaHeaderText}>Age</Text>
                    <Text style={styles.dashaHeaderText}>Duration</Text>
                  </View>
                  {charaDasha.length === 0 ? (
                    <Text style={styles.emptyHint}>No dasha data available.</Text>
                  ) : (
                    charaDasha.map(d => {
                      const startAge = birthDateObj ? yearsFromBirth(d.startDate, birthDateObj) : 0;
                      const endAge = startAge + d.years;
                      return (
                        <TouchableOpacity
                          key={`${d.sign}-${d.startDate.getTime()}`}
                          style={[
                            styles.dashaRow,
                            d.isCurrentDasha && styles.dashaRowCurrent,
                            selectedDasha === d.sign && styles.dashaRowSelected,
                          ]}
                          onPress={() => setSelectedDasha(selectedDasha === d.sign ? null : d.sign)}
                        >
                          <View
                            style={[styles.signIndicator, { backgroundColor: SIGN_COLORS[d.sign] }]}
                          />
                          <Text style={styles.dashaSign}>{d.sign}</Text>
                          <Text style={styles.dashaAge}>
                            {Math.round(startAge)} - {Math.round(endAge)}
                          </Text>
                          <Text style={styles.dashaDuration}>{formatYears(d.years)}</Text>
                          {d.isCurrentDasha && (
                            <View style={styles.currentBadge}>
                              <Text style={styles.currentText}>Now</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              )}

              {selectedDasha && (
                <SelectedDashaDetails
                  sign={selectedDasha}
                  dasha={charaDasha.find(d => d.sign === selectedDasha)}
                />
              )}
            </View>

            {/* Arudha Padas */}
            <View style={styles.section}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => setShowArudha(v => !v)}>
                <Text style={styles.sectionTitle}>Arudha Padas</Text>
                {showArudha ? (
                  <ChevronUp color={Colors.text} size={20} />
                ) : (
                  <ChevronDown color={Colors.text} size={20} />
                )}
              </TouchableOpacity>
              {showArudha && (
                <View style={styles.karakasContainer}>
                  {upapada && (
                    <View style={styles.upapadaCard}>
                      <Text style={styles.upapadaTitle}>Upapada Lagna (marriage)</Text>
                      <Text style={styles.upapadaValue}>
                        {upapada.sign} · Lord: {upapada.lord}
                      </Text>
                      <Text style={styles.upapadaDesc}>{upapada.description}</Text>
                    </View>
                  )}
                  {arudhaPadas.length === 0 ? (
                    <Text style={styles.emptyHint}>No Arudha data available.</Text>
                  ) : (
                    arudhaPadas.map(p => (
                      <View key={p.short} style={styles.arudhaCard}>
                        <View style={styles.arudhaHeader}>
                          <Text style={styles.arudhaName}>
                            {p.name} ({p.short})
                          </Text>
                          <Text style={styles.arudhaSign}>
                            {p.sign} · H{p.house}
                          </Text>
                        </View>
                        <Text style={styles.arudhaDesc}>{p.description}</Text>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>

            {/* Jaimini Yogas */}
            <View style={styles.section}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => setShowYogas(v => !v)}>
                <Text style={styles.sectionTitle}>Jaimini Yogas</Text>
                {showYogas ? (
                  <ChevronUp color={Colors.text} size={20} />
                ) : (
                  <ChevronDown color={Colors.text} size={20} />
                )}
              </TouchableOpacity>
              {showYogas && (
                <View style={styles.yogasContainer}>
                  {yogas.length === 0 ? (
                    <Text style={styles.emptyHint}>No Jaimini yogas detected.</Text>
                  ) : (
                    yogas.map(y => (
                      <View key={y.name} style={styles.yogaCardPresent}>
                        <View style={styles.yogaHeader}>
                          <Text style={styles.yogaName}>{y.name}</Text>
                          <View style={[styles.yogaStatus, { backgroundColor: '#4CAF50' }]}>
                            <Text style={styles.yogaStatusText}>Present</Text>
                          </View>
                        </View>
                        <Text style={styles.yogaDescription}>{y.description}</Text>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SelectedDashaDetails({
  sign,
  dasha,
}: {
  sign: string;
  dasha: CharaDashaPeriod | undefined;
}) {
  if (!dasha) return null;
  return (
    <View style={styles.signDetailCard}>
      <Text style={styles.signDetailTitle}>{sign} Dasha Details</Text>
      <View style={styles.signDetailRow}>
        <Text style={styles.signDetailLabel}>Element</Text>
        <Text style={styles.signDetailValue}>{SIGN_ELEMENTS[sign] ?? '-'}</Text>
      </View>
      <View style={styles.signDetailRow}>
        <Text style={styles.signDetailLabel}>Duration</Text>
        <Text style={styles.signDetailValue}>{formatYears(dasha.years)}</Text>
      </View>
      <View style={styles.signDetailRow}>
        <Text style={styles.signDetailLabel}>Starts</Text>
        <Text style={styles.signDetailValue}>{dasha.startDate.toLocaleDateString()}</Text>
      </View>
      <View style={styles.signDetailRow}>
        <Text style={styles.signDetailLabel}>Ends</Text>
        <Text style={styles.signDetailValue}>{dasha.endDate.toLocaleDateString()}</Text>
      </View>
      <Text style={styles.signDetailDescription}>
        Matters of {sign} and its lord become prominent during this period.
        Antardashas (sub-periods) fine-tune the timing within the mahadasha.
      </Text>
    </View>
  );
}

function NoBirthDetailsPrompt() {
  return (
    <View style={styles.promptCard}>
      <Text style={styles.promptTitle}>Enter your birth details first</Text>
      <Text style={styles.promptText}>
        Jaimini karakas and Chara Dasha are computed from your natal chart.
        Add your date, time, and place of birth to continue.
      </Text>
      <TouchableOpacity
        style={styles.promptButton}
        onPress={() => router.push('/(tabs)/kundli' as never)}
      >
        <Text style={styles.promptButtonText}>Open Kundli</Text>
      </TouchableOpacity>
    </View>
  );
}

function LoadingState() {
  return (
    <View style={styles.centeredState}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.centeredStateText}>Computing Jaimini data…</Text>
    </View>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <View style={styles.centeredState}>
      <Text style={[styles.centeredStateText, { color: '#F44336' }]}>{message}</Text>
    </View>
  );
}

export default function JaiminiAstrologyScreen() {
  return (
    <FeatureErrorBoundary featureName="Jaimini">
      <JaiminiScreenInner />
    </FeatureErrorBoundary>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingBottom: 12 },
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
  infoButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  infoCard: {
    margin: 16,
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  infoCardTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  infoCardText: { fontSize: 14, color: Colors.secondary, lineHeight: 22 },
  section: { margin: 16, marginTop: 0 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  karakasContainer: { marginTop: 12, gap: 10 },
  karakasIntro: { fontSize: 13, color: Colors.secondary, marginBottom: 8 },
  karakaCard: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  karakaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  karakaName: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  karakaTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  karakaPlanet: { fontSize: 13, color: Colors.primary, fontWeight: '500' },
  karakaDegree: { fontSize: 14, fontWeight: '600', color: Colors.text },
  karakaSignificance: { fontSize: 12, color: Colors.secondary },
  dashaContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginTop: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dashaHeader: {
    flexDirection: 'row',
    backgroundColor: `${Colors.primary}10`,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dashaHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
  },
  dashaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dashaRowCurrent: { backgroundColor: `${Colors.primary}10` },
  dashaRowSelected: { backgroundColor: `${Colors.primary}20` },
  signIndicator: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  dashaSign: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
  dashaAge: { flex: 1, fontSize: 12, color: Colors.text, textAlign: 'center' },
  dashaDuration: { flex: 1, fontSize: 12, color: Colors.text, textAlign: 'center' },
  currentBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  currentText: { fontSize: 10, color: '#FFF', fontWeight: '600' },
  signDetailCard: {
    marginTop: 12,
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  signDetailTitle: { fontSize: 16, fontWeight: '700', color: Colors.primary, marginBottom: 12 },
  signDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  signDetailLabel: { fontSize: 14, color: Colors.secondary },
  signDetailValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  signDetailDescription: {
    fontSize: 13,
    color: Colors.secondary,
    lineHeight: 20,
    marginTop: 12,
  },
  upapadaCard: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: 4,
  },
  upapadaTitle: { fontSize: 14, fontWeight: '600', color: Colors.primary, marginBottom: 6 },
  upapadaValue: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  upapadaDesc: { fontSize: 12, color: Colors.secondary, lineHeight: 18 },
  arudhaCard: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  arudhaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  arudhaName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  arudhaSign: { fontSize: 13, color: Colors.primary, fontWeight: '500' },
  arudhaDesc: { fontSize: 12, color: Colors.secondary, lineHeight: 18 },
  yogasContainer: { marginTop: 12, gap: 10 },
  yogaCardPresent: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  yogaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  yogaName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  yogaStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  yogaStatusText: { fontSize: 10, color: '#FFF', fontWeight: '600' },
  yogaDescription: { fontSize: 12, color: Colors.secondary, marginBottom: 6 },
  emptyHint: { padding: 16, color: Colors.textLight, fontSize: 13, textAlign: 'center' },
  promptCard: {
    margin: 16,
    padding: 20,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  promptTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  promptText: {
    fontSize: 14,
    color: Colors.secondary,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  promptButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  promptButtonText: { color: '#FFF', fontWeight: '600' },
  centeredState: { padding: 32, alignItems: 'center', gap: 12 },
  centeredStateText: { fontSize: 14, color: Colors.secondary },
});
