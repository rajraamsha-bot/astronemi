/**
 * Ashtakvarga screen — computes real Bhinnashtak + Sarvashtak from the
 * user's natal chart via `utils/ashtakvarga-engine.ts`. Prompts for birth
 * details when the kundli isn't available yet.
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
  ChevronDown,
  ChevronUp,
  Circle,
  Info,
  Moon,
  Star,
  Sun,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import {
  calculateAshtakvarga,
  classifySarvashtakStrength,
  type AshtakvargaResult,
  type BhinnashtakRow,
  type SarvashtakRow,
} from '@/utils/ashtakvarga-engine';
import { useKundliData } from '@/hooks/useKundliData';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';

const PLANET_COLORS: Record<string, string> = {
  Sun: '#FF9800',
  Moon: '#9C27B0',
  Mars: '#F44336',
  Mercury: '#4CAF50',
  Jupiter: '#2196F3',
  Venus: '#E91E63',
  Saturn: '#607D8B',
};

function bindiColor(value: number): string {
  if (value >= 5) return '#4CAF50';
  if (value >= 3) return '#FF9800';
  return '#F44336';
}

function houseColor(total: number): string {
  switch (classifySarvashtakStrength(total)) {
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

const HOUSE_SIGNIFICATIONS: Record<number, string> = {
  1: 'Self, Body, Personality, Health, Appearance',
  2: 'Wealth, Family, Speech, Food, Early Childhood',
  3: 'Siblings, Courage, Communication, Short Travels',
  4: 'Mother, Property, Vehicles, Home, Education',
  5: 'Children, Creativity, Romance, Speculation',
  6: 'Disease, Enemies, Debts, Service, Competition',
  7: 'Marriage, Partnerships, Business, Public Relations',
  8: 'Longevity, Transformation, Inheritance, Occult',
  9: 'Fortune, Higher Learning, Religion, Father',
  10: 'Career, Status, Authority, Public Image',
  11: 'Gains, Friends, Aspirations, Elder Siblings',
  12: 'Loss, Spirituality, Foreign Lands, Expenses',
};

const REMEDY_BY_PLANET: Record<string, string> = {
  Sun: 'Chant Aditya Hridaya Stotra, offer water at sunrise',
  Moon: 'Chant Om Chandraya Namah, worship Lord Shiva',
  Mars: 'Chant Om Angarkaya Namah, worship Hanuman',
  Mercury: 'Chant Om Budhaya Namah, worship Lord Vishnu',
  Jupiter: 'Chant Om Brim Brihaspataye Namah, serve a teacher',
  Venus: 'Chant Om Shukraya Namah, worship Lakshmi',
  Saturn: 'Chant Om Sham Shanaishcharaya Namah, serve the elderly',
};

function AshtakvargaScreenInner() {
  const { data: kundli, isLoading, error, noBirthDetails } = useKundliData();
  const [showBhinnashtak, setShowBhinnashtak] = useState(true);
  const [showSarvashtak, setShowSarvashtak] = useState(true);
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);

  const ashtakvarga: AshtakvargaResult | null = useMemo(() => {
    if (!kundli) return null;
    try {
      return calculateAshtakvarga(kundli.planets, kundli.ascendant.signIndex);
    } catch {
      return null;
    }
  }, [kundli]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#004D40', '#00695C', '#00796B']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color="#FFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Ashtakvarga</Text>
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
            <Text style={styles.infoCardTitle}>What is Ashtakvarga?</Text>
          </View>
          <Text style={styles.infoCardText}>
            Ashtakvarga assigns bindus (points) to each sign from each planet
            and the ascendant. Higher bindus mean stronger fructification of the
            matters signified by that sign or house.
          </Text>
        </View>

        {noBirthDetails && <NoBirthDetailsPrompt />}
        {isLoading && <LoadingState />}
        {error && !noBirthDetails && (
          <ErrorState message="Couldn't compute Ashtakvarga. Check your birth details." />
        )}

        {ashtakvarga && (
          <>
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setShowBhinnashtak(v => !v)}
              >
                <Text style={styles.sectionTitle}>Bhinnashtak (Individual Points)</Text>
                {showBhinnashtak ? (
                  <ChevronUp color={Colors.text} size={20} />
                ) : (
                  <ChevronDown color={Colors.text} size={20} />
                )}
              </TouchableOpacity>

              {showBhinnashtak && (
                <>
                  <BhinnashtakTable
                    rows={ashtakvarga.bhinnashtak}
                    selectedPlanet={selectedPlanet}
                    onSelectPlanet={name =>
                      setSelectedPlanet(selectedPlanet === name ? null : name)
                    }
                  />
                  {selectedPlanet && (
                    <PlanetAnalysis
                      row={ashtakvarga.bhinnashtak.find(r => r.planet === selectedPlanet)!}
                    />
                  )}
                </>
              )}
            </View>

            <View style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setShowSarvashtak(v => !v)}
              >
                <Text style={styles.sectionTitle}>Sarvashtak (Combined Points)</Text>
                {showSarvashtak ? (
                  <ChevronUp color={Colors.text} size={20} />
                ) : (
                  <ChevronDown color={Colors.text} size={20} />
                )}
              </TouchableOpacity>

              {showSarvashtak && (
                <>
                  <SarvashtakTable
                    rows={ashtakvarga.sarvashtakByHouse}
                    selectedHouse={selectedHouse}
                    onSelectHouse={h => setSelectedHouse(selectedHouse === h ? null : h)}
                    grandTotal={ashtakvarga.grandTotal}
                  />
                  {selectedHouse != null && (
                    <HouseAnalysis
                      row={ashtakvarga.sarvashtakByHouse.find(r => r.house === selectedHouse)!}
                    />
                  )}
                </>
              )}
            </View>

            <View style={styles.guideSection}>
              <Text style={styles.guideTitle}>Strength Guide</Text>
              {(
                [
                  ['#4CAF50', '30+ bindus — Excellent'],
                  ['#8BC34A', '25-29 bindus — Good'],
                  ['#FF9800', '20-24 bindus — Average'],
                  ['#F44336', 'Below 20 — Weak, needs remedies'],
                ] as const
              ).map(([color, label]) => (
                <View key={label} style={styles.guideRow}>
                  <View style={[styles.guideDot, { backgroundColor: color }]} />
                  <Text style={styles.guideText}>{label}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function BhinnashtakTable({
  rows,
  selectedPlanet,
  onSelectPlanet,
}: {
  rows: BhinnashtakRow[];
  selectedPlanet: string | null;
  onSelectPlanet: (p: string) => void;
}) {
  return (
    <View style={styles.tableContainer}>
      <View style={styles.tableHeader}>
        <Text style={styles.headerCell}>Planet</Text>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
          <Text key={n} style={styles.headerCellSmall}>{n}</Text>
        ))}
        <Text style={styles.headerCell}>Total</Text>
      </View>
      {rows.map(row => (
        <TouchableOpacity
          key={row.planet}
          style={[styles.tableRow, selectedPlanet === row.planet && styles.tableRowSelected]}
          onPress={() => onSelectPlanet(row.planet)}
          accessibilityLabel={`${row.planet} total bindus ${row.total}`}
        >
          <View style={[styles.planetCell, { backgroundColor: `${PLANET_COLORS[row.planet]}20` }]}>
            <Text style={[styles.planetName, { color: PLANET_COLORS[row.planet] }]}>
              {row.planet.slice(0, 3)}
            </Text>
          </View>
          {row.values.map((v, i) => (
            <Text key={i} style={[styles.valueCell, { color: bindiColor(v) }]}>
              {v}
            </Text>
          ))}
          <Text style={styles.totalCell}>{row.total}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function SarvashtakTable({
  rows,
  selectedHouse,
  onSelectHouse,
  grandTotal,
}: {
  rows: SarvashtakRow[];
  selectedHouse: number | null;
  onSelectHouse: (h: number) => void;
  grandTotal: number;
}) {
  return (
    <View style={styles.tableContainer}>
      <View style={styles.tableHeader}>
        <Text style={styles.headerCell}>House</Text>
        <Text style={styles.headerCellSmall}>Su</Text>
        <Text style={styles.headerCellSmall}>Mo</Text>
        <Text style={styles.headerCellSmall}>Ma</Text>
        <Text style={styles.headerCellSmall}>Me</Text>
        <Text style={styles.headerCellSmall}>Ju</Text>
        <Text style={styles.headerCellSmall}>Ve</Text>
        <Text style={styles.headerCellSmall}>Sa</Text>
        <Text style={styles.headerCell}>Total</Text>
      </View>
      {rows.map(row => (
        <TouchableOpacity
          key={row.house}
          style={[styles.tableRow, selectedHouse === row.house && styles.tableRowSelected]}
          onPress={() => onSelectHouse(row.house)}
        >
          <Text style={styles.houseCell}>{row.house}</Text>
          <Text style={styles.valueCell}>{row.sun}</Text>
          <Text style={styles.valueCell}>{row.moon}</Text>
          <Text style={styles.valueCell}>{row.mars}</Text>
          <Text style={styles.valueCell}>{row.mercury}</Text>
          <Text style={styles.valueCell}>{row.jupiter}</Text>
          <Text style={styles.valueCell}>{row.venus}</Text>
          <Text style={styles.valueCell}>{row.saturn}</Text>
          <Text style={[styles.totalCell, { color: houseColor(row.total) }]}>{row.total}</Text>
        </TouchableOpacity>
      ))}
      <View style={styles.grandTotalRow}>
        <Text style={styles.grandTotalLabel}>Grand Total</Text>
        <Text style={styles.grandTotalValue}>{grandTotal}</Text>
      </View>
    </View>
  );
}

function PlanetAnalysis({ row }: { row: BhinnashtakRow }) {
  return (
    <View style={styles.analysisCard}>
      <View style={styles.analysisHeader}>
        <View style={[styles.planetIcon, { backgroundColor: PLANET_COLORS[row.planet] }]}>
          {row.planet === 'Sun' && <Sun color="#FFF" size={20} />}
          {row.planet === 'Moon' && <Moon color="#FFF" size={20} />}
          {row.planet !== 'Sun' && row.planet !== 'Moon' && <Circle color="#FFF" size={20} />}
        </View>
        <Text style={styles.analysisTitle}>{row.planet} Bhinnashtak</Text>
      </View>
      <Text style={styles.analysisText}>Total bindus: {row.total} (max 48–56 depending on planet)</Text>
      <Text style={styles.analysisText}>
        {row.total >= 30
          ? `${row.planet} has a strong overall footprint in your chart.`
          : row.total >= 22
          ? `${row.planet} has moderate strength — mix of favourable and neutral placements.`
          : `${row.planet} is under-supported; consider planetary remedies.`}
      </Text>
      <View style={styles.remediesSection}>
        <Text style={styles.remediesTitle}>Traditional remedy</Text>
        <Text style={styles.remedyText}>{REMEDY_BY_PLANET[row.planet]}</Text>
      </View>
    </View>
  );
}

function HouseAnalysis({ row }: { row: SarvashtakRow }) {
  const strength = classifySarvashtakStrength(row.total);
  return (
    <View style={styles.analysisCard}>
      <Text style={styles.analysisTitle}>
        House {row.house} · {row.sign}
      </Text>
      <View style={styles.strengthBar}>
        <View
          style={[
            styles.strengthFill,
            { width: `${Math.min(100, (row.total / 56) * 100)}%`, backgroundColor: houseColor(row.total) },
          ]}
        />
      </View>
      <Text style={styles.strengthLabel}>
        Sarvashtak: {row.total}/56 ({strength})
      </Text>
      <Text style={styles.analysisText}>
        {strength === 'Excellent' || strength === 'Good'
          ? `House ${row.house} is well-supported. Matters of this house tend to fructify with steady effort.`
          : strength === 'Average'
          ? `House ${row.house} has moderate Sarvashtak. Results come gradually; transits through this sign matter.`
          : `House ${row.house} is under-supported; tread carefully during transits of malefics here.`}
      </Text>
      <View style={styles.houseSignifications}>
        <Text style={styles.sigTitle}>Significations</Text>
        <Text style={styles.sigText}>{HOUSE_SIGNIFICATIONS[row.house] ?? '—'}</Text>
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
        Ashtakvarga uses your natal chart. Add your date, time, and place of
        birth to generate your Bhinnashtak and Sarvashtak tables.
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
      <Text style={styles.centeredStateText}>Computing Ashtakvarga…</Text>
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

export default function AshtakvargaScreen() {
  return (
    <FeatureErrorBoundary featureName="Ashtakvarga">
      <AshtakvargaScreenInner />
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
  tableContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: `${Colors.primary}10`,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerCell: {
    width: 50,
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
  },
  headerCellSmall: {
    width: 22,
    fontSize: 9,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableRowSelected: { backgroundColor: `${Colors.primary}10` },
  planetCell: { width: 50, alignItems: 'center', paddingVertical: 4, borderRadius: 6 },
  planetName: { fontSize: 11, fontWeight: '600' },
  houseCell: {
    width: 50,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
  },
  valueCell: { width: 22, fontSize: 11, color: Colors.text, textAlign: 'center' },
  totalCell: {
    width: 50,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: `${Colors.primary}10`,
  },
  grandTotalLabel: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  grandTotalValue: { fontSize: 14, fontWeight: '700', color: Colors.text },
  analysisCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  analysisHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  planetIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  analysisText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  strengthBar: { height: 8, backgroundColor: Colors.border, borderRadius: 4, marginBottom: 8 },
  strengthFill: { height: '100%', borderRadius: 4 },
  strengthLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  houseSignifications: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
  },
  sigTitle: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  sigText: { fontSize: 12, color: Colors.textSecondary },
  remediesSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  remediesTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  remedyText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  guideSection: {
    margin: 16,
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  guideTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  guideRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  guideDot: { width: 12, height: 12, borderRadius: 6 },
  guideText: { fontSize: 14, color: Colors.text },
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
