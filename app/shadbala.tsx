/**
 * Shadbala screen — now reads the real six-fold strength from the active
 * kundli via `utils/shadbala-engine.ts`. Falls back to a "set your birth
 * details" prompt when the user hasn't completed onboarding.
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
import {
  ArrowLeft,
  Award,
  ChevronDown,
  ChevronUp,
  Circle,
  Info,
  Moon,
  Sun,
  TrendingUp,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import type { ShadbalaResult } from '@/utils/shadbala-engine';
import { useKundliData } from '@/hooks/useKundliData';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';
import { Logger } from '@/services/logger';

// ─── Presentation helpers ────────────────────────────────────────────────────

type Status = 'Excellent' | 'Good' | 'Average' | 'Weak';

function statusFromPercentage(pct: number): Status {
  if (pct >= 110) return 'Excellent';
  if (pct >= 90) return 'Good';
  if (pct >= 70) return 'Average';
  return 'Weak';
}

const PLANET_COLORS: Record<string, string> = {
  Sun: '#FF9800',
  Moon: '#9C27B0',
  Mars: '#F44336',
  Mercury: '#4CAF50',
  Jupiter: '#2196F3',
  Venus: '#E91E63',
  Saturn: '#607D8B',
};

function statusColor(status: Status): string {
  switch (status) {
    case 'Excellent':
      return '#4CAF50';
    case 'Good':
      return '#8BC34A';
    case 'Average':
      return '#FF9800';
    case 'Weak':
      return '#F44336';
  }
}

const STRENGTH_GLOSSARY: { name: string; description: string; maxPoints: number }[] = [
  { name: 'Sthana Bala', description: 'Positional strength from exaltation, own sign, varga placements.', maxPoints: 300 },
  { name: 'Dig Bala', description: 'Directional strength from house placement.', maxPoints: 60 },
  { name: 'Kaala Bala', description: 'Temporal strength from day/night, planetary hour, Paksha.', maxPoints: 120 },
  { name: 'Chestha Bala', description: 'Motional strength from speed and retrogression.', maxPoints: 60 },
  { name: 'Naisargika Bala', description: 'Intrinsic natural strength (Sun strongest, Saturn weakest).', maxPoints: 60 },
  { name: 'Drik Bala', description: 'Aspectual strength from benefic / malefic gazes.', maxPoints: 60 },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

function ShadbalaScreenInner() {
  const { data: kundli, isLoading, error, noBirthDetails } = useKundliData();
  const [selected, setSelected] = useState<ShadbalaResult | null>(null);
  const [showList, setShowList] = useState(true);
  const [showGlossary, setShowGlossary] = useState(false);

  const shadbala: ShadbalaResult[] = useMemo(() => kundli?.shadbala ?? [], [kundli]);

  const summary = useMemo(() => {
    const strong = shadbala.filter(r => r.percentage >= 90).length;
    const weak = shadbala.filter(r => r.percentage < 70).length;
    return { strong, weak };
  }, [shadbala]);

  if (error) {
    Logger.error('Shadbala screen failed to compute kundli', error);
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#4A148C', '#6A1B9A', '#7B1FA2']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color="#FFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Shadbala Analysis</Text>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => setShowGlossary(v => !v)}
              accessibilityLabel="Toggle Shadbala glossary"
            >
              <Info color="#FFF" size={22} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Award color="#FF9800" size={20} />
            <Text style={styles.infoCardTitle}>What is Shadbala?</Text>
          </View>
          <Text style={styles.infoCardText}>
            Shadbala measures the six-fold strength of the seven classical planets
            from your birth chart. Each component is scored in Virupas and compared
            against the minimum requirement prescribed by BPHS.
          </Text>
        </View>

        {noBirthDetails && <NoBirthDetailsPrompt />}
        {isLoading && <LoadingState />}
        {error && !noBirthDetails && (
          <ErrorState message="Couldn't compute Shadbala. Check your internet connection and birth details." />
        )}

        {!noBirthDetails && !isLoading && shadbala.length > 0 && (
          <>
            {showGlossary && (
              <View style={styles.glossarySection}>
                <Text style={styles.sectionTitle}>Six Strengths</Text>
                {STRENGTH_GLOSSARY.map(item => (
                  <View key={item.name} style={styles.glossaryCard}>
                    <View style={styles.glossaryHeader}>
                      <Text style={styles.glossaryName}>{item.name}</Text>
                      <Text style={styles.glossaryMax}>Max: {item.maxPoints}</Text>
                    </View>
                    <Text style={styles.glossaryDesc}>{item.description}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Overall Planetary Strength</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <TrendingUp color="#4CAF50" size={20} />
                  <Text style={styles.summaryValue}>{summary.strong}</Text>
                  <Text style={styles.summaryLabel}>Strong Planets</Text>
                </View>
                <View style={styles.summaryItem}>
                  <TrendingUp color="#F44336" size={20} />
                  <Text style={styles.summaryValue}>{summary.weak}</Text>
                  <Text style={styles.summaryLabel}>Weak Planets</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => setShowList(v => !v)}>
                <Text style={styles.sectionTitle}>Planetary Strengths</Text>
                {showList ? (
                  <ChevronUp color={Colors.text} size={20} />
                ) : (
                  <ChevronDown color={Colors.text} size={20} />
                )}
              </TouchableOpacity>
              {showList && (
                <View style={styles.planetsList}>
                  {shadbala.map(result => {
                    const status = statusFromPercentage(result.percentage);
                    const isSelected = selected?.planet === result.planet;
                    return (
                      <TouchableOpacity
                        key={result.planet}
                        style={[styles.planetCard, isSelected && styles.planetCardSelected]}
                        onPress={() => setSelected(isSelected ? null : result)}
                        accessibilityRole="button"
                        accessibilityLabel={`${result.planet} strength ${result.percentage} percent, ${status}`}
                      >
                        <View style={styles.planetHeader}>
                          <View style={[styles.planetIcon, { backgroundColor: PLANET_COLORS[result.planet] }]}>
                            {result.planet === 'Sun' && <Sun color="#FFF" size={18} />}
                            {result.planet === 'Moon' && <Moon color="#FFF" size={18} />}
                            {result.planet !== 'Sun' && result.planet !== 'Moon' && (
                              <Circle color="#FFF" size={18} />
                            )}
                          </View>
                          <View style={styles.planetInfo}>
                            <Text style={styles.planetName}>{result.planet}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: statusColor(status) }]}>
                              <Text style={styles.statusText}>{status}</Text>
                            </View>
                          </View>
                          <View style={styles.scoreContainer}>
                            <Text style={styles.scoreValue}>{result.percentage}%</Text>
                            <Text style={styles.scoreLabel}>Rank #{result.rank}</Text>
                          </View>
                        </View>

                        <View style={styles.strengthBar}>
                          <View
                            style={[
                              styles.strengthFill,
                              {
                                width: `${Math.min(result.percentage, 150) / 1.5}%`,
                                backgroundColor: statusColor(status),
                              },
                            ]}
                          />
                        </View>

                        <View style={styles.strengthBreakdown}>
                          {(
                            [
                              ['Sthana', result.sthanaBala],
                              ['Dig', result.digBala],
                              ['Kaala', result.kaalaBala],
                              ['Chestha', result.chesthaBala],
                              ['Naisarg', result.naisargikaBala],
                              ['Drik', result.drikBala],
                            ] as const
                          ).map(([label, value]) => (
                            <View key={label} style={styles.strengthItem}>
                              <Text style={styles.strengthItemLabel}>{label}</Text>
                              <Text style={styles.strengthItemValue}>{Math.round(value)}</Text>
                            </View>
                          ))}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {selected && <SelectedPlanetDetails result={selected} />}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ─── Detail card ─────────────────────────────────────────────────────────────

function SelectedPlanetDetails({ result }: { result: ShadbalaResult }) {
  const status = statusFromPercentage(result.percentage);

  return (
    <View style={styles.detailCard}>
      <Text style={styles.detailTitle}>{result.planet} — Detailed Analysis</Text>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Total Shadbala</Text>
        <Text style={styles.detailValue}>{result.totalShadbala} Virupas</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>In Rupas</Text>
        <Text style={styles.detailValue}>{result.totalRupas}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Strength</Text>
        <Text style={[styles.detailValue, { color: statusColor(status) }]}>
          {result.percentage}% · {status}
        </Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.analysisTitle}>Component Breakdown</Text>

      {(
        [
          { name: 'Sthana Bala (Positional)', value: result.sthanaBala, max: 300 },
          { name: 'Dig Bala (Directional)', value: result.digBala, max: 60 },
          { name: 'Kaala Bala (Temporal)', value: result.kaalaBala, max: 120 },
          { name: 'Chestha Bala (Motional)', value: result.chesthaBala, max: 60 },
          { name: 'Naisargika Bala (Natural)', value: result.naisargikaBala, max: 60 },
          { name: 'Drik Bala (Aspectual)', value: result.drikBala, max: 60 },
        ]
      ).map(item => (
        <View key={item.name} style={styles.analysisItem}>
          <View style={styles.analysisHeader}>
            <Text style={styles.analysisName}>{item.name}</Text>
            <Text style={styles.analysisScore}>
              {item.value.toFixed(1)} / {item.max}
            </Text>
          </View>
          <View style={styles.miniBar}>
            <View
              style={[
                styles.miniFill,
                { width: `${Math.min(100, (item.value / item.max) * 100)}%` },
              ]}
            />
          </View>
        </View>
      ))}

      <View style={styles.remedySection}>
        <Text style={styles.remedyTitle}>Reading</Text>
        <Text style={styles.remedyText}>
          {status === 'Excellent' && `${result.planet} is exceptionally strong. Matters it governs will flow easily for you.`}
          {status === 'Good' && `${result.planet} is well-supported. Its areas of life should feel balanced and productive.`}
          {status === 'Average' && `${result.planet} has moderate strength. Results will come with steady effort and remedies.`}
          {status === 'Weak' && `${result.planet} is under-strength. Consider mantra, gemstone, or charitable remedies tied to this planet.`}
        </Text>
      </View>
    </View>
  );
}

// ─── Empty / loading / error states ──────────────────────────────────────────

function NoBirthDetailsPrompt() {
  return (
    <View style={styles.promptCard}>
      <Text style={styles.promptTitle}>Enter your birth details first</Text>
      <Text style={styles.promptText}>
        Shadbala is computed from your natal chart. Add your date, time, and
        place of birth to generate your six-fold strength report.
      </Text>
      <TouchableOpacity
        style={styles.promptButton}
        onPress={() => router.push('/(tabs)/kundli' as never)}
        accessibilityRole="button"
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
      <Text style={styles.centeredStateText}>Computing Shadbala…</Text>
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

export default function ShadbalaScreen() {
  return (
    <FeatureErrorBoundary featureName="Shadbala">
      <ShadbalaScreenInner />
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
  infoCardText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  glossarySection: { margin: 16, marginTop: 0 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  glossaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  glossaryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  glossaryName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  glossaryMax: { fontSize: 12, color: Colors.primary, fontWeight: '500' },
  glossaryDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  summaryCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center', gap: 6 },
  summaryValue: { fontSize: 24, fontWeight: '700', color: Colors.text },
  summaryLabel: { fontSize: 12, color: Colors.textLight },
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
  planetsList: { marginTop: 12, gap: 12 },
  planetCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  planetCardSelected: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}05` },
  planetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  planetIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planetInfo: { flex: 1 },
  planetName: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  statusText: { fontSize: 10, color: '#FFF', fontWeight: '600' },
  scoreContainer: { alignItems: 'flex-end' },
  scoreValue: { fontSize: 18, fontWeight: '700', color: Colors.text },
  scoreLabel: { fontSize: 10, color: Colors.textLight },
  strengthBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, marginBottom: 12 },
  strengthFill: { height: '100%', borderRadius: 3 },
  strengthBreakdown: { flexDirection: 'row', justifyContent: 'space-between' },
  strengthItem: { alignItems: 'center' },
  strengthItemLabel: { fontSize: 9, color: Colors.textLight, marginBottom: 2 },
  strengthItemValue: { fontSize: 12, fontWeight: '600', color: Colors.text },
  detailCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  detailTitle: { fontSize: 16, fontWeight: '700', color: Colors.primary, marginBottom: 16 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: { fontSize: 14, color: Colors.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 16 },
  analysisTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  analysisItem: { marginBottom: 14 },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  analysisName: { fontSize: 13, fontWeight: '500', color: Colors.text },
  analysisScore: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  miniBar: { height: 4, backgroundColor: Colors.border, borderRadius: 2, marginBottom: 4 },
  miniFill: { height: '100%', borderRadius: 2, backgroundColor: Colors.primary },
  remedySection: { marginTop: 16, padding: 12, backgroundColor: Colors.background, borderRadius: 8 },
  remedyTitle: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  remedyText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
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
    color: Colors.textSecondary,
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
  centeredStateText: { fontSize: 14, color: Colors.textSecondary },
});
