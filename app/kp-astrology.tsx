import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Calendar, Clock, MapPin, Star, Info,
  ChevronDown, ChevronUp, Sparkles,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { generateKPChart, KPChart, KPPlanet } from '@/utils/kp-engine';
import { geocodeCity, calculateLahiriAyanamsa } from '@/utils/jaimini-engine';
import { getKPSubLordInterpretation } from '@/utils/interpretations';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useUserEngagement } from '@/contexts/UserEngagementContext';
import FeatureLockModal from '@/components/FeatureLockModal';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';



export default function KPAstrologyScreen() {
  const { checkAccess, showLockModal, lockedFeature, closeLockModal } = useFeatureAccess();
  const { currentTier, tierProgress } = useUserEngagement();
  
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [loading, setLoading] = useState(false);
  const [chart, setChart] = useState<KPChart | null>(null);
  const [showPlanets, setShowPlanets] = useState(true);
  const [showHouses, setShowHouses] = useState(true);
  const [showPredictions, setShowPredictions] = useState(true);
  const [selectedPlanet, setSelectedPlanet] = useState<KPPlanet | null>(null);

  // Check feature access on mount
  useEffect(() => {
    if (!checkAccess('kp-astrology')) {
      // Modal will show automatically, navigate back after a delay
      setTimeout(() => router.back(), 100);
    }
  }, [checkAccess]);

  const calculate = async () => {
    if (!date.trim() || !time.trim() || !place.trim()) {
      Alert.alert('Missing Details', 'Please enter date, time, and place.');
      return;
    }

    setLoading(true);
    try {
      // Parse date DD/MM/YYYY
      const [dd, mm, yyyy] = date.split('/').map(Number) as number[];
      const [hh = 0, min = 0] = time.split(':').map(Number) as number[];

      if (!dd || !mm || !yyyy || isNaN(hh) || isNaN(min)) {
        Alert.alert('Invalid Format', 'Use DD/MM/YYYY for date and HH:MM for time.');
        setLoading(false);
        return;
      }

      // Geocode the city
      const geo = await geocodeCity(place);
      const lat = geo?.latitude ?? 20.5937;
      const lon = geo?.longitude ?? 78.9629;
      const tz = geo?.timezone ?? 5.5;

      // Calculate Julian Day and Lahiri ayanamsa
      const jd = 2451545.0 + (Date.UTC(yyyy, mm - 1, dd, (hh ?? 0) - tz, min ?? 0) - Date.UTC(2000, 0, 1, 12)) / 86400000;
      const ayanamsa = calculateLahiriAyanamsa(jd);

      // Simple ascendant calculation (RAMC-based)
      const lst = ((280.46061837 + 360.98564736629 * (jd - 2451545.0)) % 360 + 360) % 360;
      const ascTropical = (lst + lon + ((hh ?? 0) + (min ?? 0) / 60 - tz) * 15) % 360;
      const ascSidereal = ((ascTropical - ayanamsa) % 360 + 360) % 360;

      // Calculate real planet positions
      const T = (jd - 2451545.0) / 36525.0;
      
      const getLong = (pos: { longitude: number }) => ((pos.longitude - ayanamsa) % 360 + 360) % 360;
      
      const planets = [
        { name: 'Sun',     longitude: getLong({ longitude: (280.466 + 36000.77 * T) % 360 }), house: 0, isRetrograde: false },
        { name: 'Moon',    longitude: getLong({ longitude: (218.316 + 481267.881 * T) % 360 }), house: 0, isRetrograde: false },
        { name: 'Mars',    longitude: getLong({ longitude: (355.433 + 19140.3 * T) % 360 }), house: 0, isRetrograde: false },
        { name: 'Mercury', longitude: getLong({ longitude: (252.25 + 149472.67 * T) % 360 }), house: 0, isRetrograde: false },
        { name: 'Jupiter', longitude: getLong({ longitude: (34.35 + 3034.9 * T) % 360 }), house: 0, isRetrograde: false },
        { name: 'Venus',   longitude: getLong({ longitude: (181.98 + 58517.81 * T) % 360 }), house: 0, isRetrograde: false },
        { name: 'Saturn',  longitude: getLong({ longitude: (50.07 + 1222.11 * T) % 360 }), house: 0, isRetrograde: false },
        { name: 'Rahu',    longitude: getLong({ longitude: (125.04 - 1934.13 * T) % 360 }), house: 0, isRetrograde: true },
        { name: 'Ketu',    longitude: getLong({ longitude: (125.04 - 1934.13 * T + 180) % 360 }), house: 0, isRetrograde: true },
      ];

      // Generate KP chart
      const kpChart = generateKPChart(planets, ascSidereal, lat, ayanamsa);
      setChart(kpChart);
    } catch {
      Alert.alert('Error', 'Could not calculate chart. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'Strong': return Colors.success;
      case 'Moderate': return Colors.gold;
      case 'Weak': return Colors.secondary;
      default: return Colors.error;
    }
  };

  return (
    <FeatureErrorBoundary featureName="KP Astrology">
    <View style={styles.container}>
      <LinearGradient colors={['#1A237E', '#283593', '#3949AB']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color="#FFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>KP Astrology</Text>
            <TouchableOpacity style={styles.infoButton}>
              <Info color="#FFF" size={22} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <View style={styles.headerSub}>
          <Text style={styles.headerSubText}>Krishnamurti Paddhati — Sub-Lord Theory</Text>
          <Text style={styles.headerDesc}>100% local · No API · Real calculations</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Input */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Birth Details</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputField}>
              <Calendar color={Colors.primary} size={16} />
              <TextInput
                style={styles.input}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={Colors.textLight}
                value={date}
                onChangeText={setDate}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputField}>
              <Clock color={Colors.primary} size={16} />
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                placeholderTextColor={Colors.textLight}
                value={time}
                onChangeText={setTime}
                keyboardType="numeric"
              />
            </View>
          </View>
          <View style={styles.inputField}>
            <MapPin color={Colors.primary} size={16} />
            <TextInput
              style={styles.input}
              placeholder="City, Country"
              placeholderTextColor={Colors.textLight}
              value={place}
              onChangeText={setPlace}
            />
          </View>
          <TouchableOpacity
            style={[styles.calcButton, loading && styles.calcButtonDisabled]}
            onPress={calculate}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Sparkles color="#FFF" size={18} />}
            <Text style={styles.calcButtonText}>{loading ? 'Calculating...' : 'Calculate KP Chart'}</Text>
          </TouchableOpacity>
        </View>

        {/* KP Info */}
        {!chart && (
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Star color="#FF9800" size={20} />
              <Text style={styles.infoCardTitle}>What is KP Astrology?</Text>
            </View>
            <Text style={styles.infoCardText}>
              KP (Krishnamurti Paddhati) is a stellar astrology system developed by Prof. K.S. Krishnamurti.
              It uses Placidus house division and nakshatra-based predictions with sub-lord theory for precise timing of events.
              {'\n\n'}The key insight: every degree of the zodiac has a Sign Lord → Star Lord → Sub Lord.
              The Sub Lord is the final deciding factor for any event.
            </Text>
            <View style={styles.rulesList}>
              {[
                'Marriage: 7th cusp sub-lord must signify houses 2, 7, 11',
                'Career: 10th cusp sub-lord must signify houses 2, 6, 10',
                'Children: 5th cusp sub-lord must signify houses 2, 5, 11',
                'Foreign travel: 12th cusp sub-lord must signify houses 3, 9, 12',
              ].map((rule, i) => (
                <View key={i} style={styles.ruleRow}>
                  <Text style={styles.ruleBullet}>•</Text>
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Chart Results */}
        {chart && (
          <>
            {/* Ruling Planets */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚡ KP Ruling Planets (Today)</Text>
              <View style={styles.rulingGrid}>
                {[
                  { label: 'Day Lord', value: chart.rulingPlanets.dayLord },
                  { label: 'Moon Sign Lord', value: chart.rulingPlanets.moonSignLord },
                  { label: 'Moon Star Lord', value: chart.rulingPlanets.moonStarLord },
                  { label: 'Moon Sub Lord', value: chart.rulingPlanets.moonSubLord },
                  { label: 'Asc Sign Lord', value: chart.rulingPlanets.ascendantSignLord },
                  { label: 'Asc Star Lord', value: chart.rulingPlanets.ascendantStarLord },
                ].map((item, i) => (
                  <View key={i} style={styles.rulingItem}>
                    <Text style={styles.rulingLabel}>{item.label}</Text>
                    <Text style={styles.rulingValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.rulingFinal}>
                <Text style={styles.rulingFinalLabel}>Combined Ruling Planets</Text>
                <Text style={styles.rulingFinalValue}>{chart.rulingPlanets.rulingPlanets.join(' · ')}</Text>
              </View>
            </View>

            {/* Planets Table */}
            <View style={styles.section}>
              <TouchableOpacity style={styles.toggleHeader} onPress={() => setShowPlanets(!showPlanets)}>
                <Text style={styles.sectionTitle}>🪐 Planetary Sub-Lords</Text>
                {showPlanets ? <ChevronUp color={Colors.text} size={20} /> : <ChevronDown color={Colors.text} size={20} />}
              </TouchableOpacity>
              {showPlanets && (
                <>
                  <View style={styles.tableHeader}>
                    {['Planet', 'Sign', 'Star Lord', 'Sub Lord', 'House'].map(h => (
                      <Text key={h} style={[styles.tableHeaderCell, { flex: h === 'Planet' ? 1.2 : 1 }]}>{h}</Text>
                    ))}
                  </View>
                  {chart.planets.map((p, i) => (
                    <TouchableOpacity
                      key={p.name}
                      style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt, selectedPlanet?.name === p.name && styles.tableRowSelected]}
                      onPress={() => setSelectedPlanet(selectedPlanet?.name === p.name ? null : p)}
                    >
                      <Text style={[styles.tableCell, { flex: 1.2, fontWeight: '700', color: Colors.primary }]}>
                        {p.name}{p.isRetrograde ? ' ℞' : ''}
                      </Text>
                      <Text style={styles.tableCell}>{p.sign.substring(0, 3)}</Text>
                      <Text style={styles.tableCell}>{p.starLord}</Text>
                      <Text style={[styles.tableCell, { color: Colors.primary, fontWeight: '600' }]}>{p.subLord}</Text>
                      <Text style={styles.tableCell}>{p.house}</Text>
                    </TouchableOpacity>
                  ))}
                  {selectedPlanet && (
                    <View style={styles.planetDetail}>
                      <Text style={styles.planetDetailTitle}>{selectedPlanet.name} — Sub-Lord Analysis</Text>
                      <Text style={styles.planetDetailText}>
                        <Text style={{ fontWeight: '700' }}>Sign:</Text> {selectedPlanet.sign} (Lord: {selectedPlanet.signLord}){'\n'}
                        <Text style={{ fontWeight: '700' }}>Nakshatra:</Text> {selectedPlanet.nakshatra} Pada {selectedPlanet.pada}{'\n'}
                        <Text style={{ fontWeight: '700' }}>Star Lord:</Text> {selectedPlanet.starLord}{'\n'}
                        <Text style={{ fontWeight: '700' }}>Sub Lord:</Text> {selectedPlanet.subLord}{'\n'}
                        <Text style={{ fontWeight: '700' }}>Houses Signified:</Text> {selectedPlanet.housesSignified.join(', ')}{'\n\n'}
                        {getKPSubLordInterpretation(selectedPlanet.subLord)}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* House Cusps */}
            <View style={styles.section}>
              <TouchableOpacity style={styles.toggleHeader} onPress={() => setShowHouses(!showHouses)}>
                <Text style={styles.sectionTitle}>🏠 Cuspal Sub-Lords</Text>
                {showHouses ? <ChevronUp color={Colors.text} size={20} /> : <ChevronDown color={Colors.text} size={20} />}
              </TouchableOpacity>
              {showHouses && (
                <>
                  <View style={styles.tableHeader}>
                    {['House', 'Sign', 'Star Lord', 'Sub Lord', 'Promised'].map(h => (
                      <Text key={h} style={styles.tableHeaderCell}>{h}</Text>
                    ))}
                  </View>
                  {chart.cusps.map((c, i) => {
                    const sig = chart.significators.find(s => s.house === c.house);
                    return (
                      <View key={c.house} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                        <Text style={[styles.tableCell, { fontWeight: '700', color: Colors.primary }]}>{c.house}</Text>
                        <Text style={styles.tableCell}>{c.sign.substring(0, 3)}</Text>
                        <Text style={styles.tableCell}>{c.starLord}</Text>
                        <Text style={[styles.tableCell, { color: Colors.primary, fontWeight: '600' }]}>{c.subLord}</Text>
                        <Text style={[styles.tableCell, { color: sig?.isPromised ? Colors.success : Colors.error, fontWeight: '700' }]}>
                          {sig?.isPromised ? '✓' : '✗'}
                        </Text>
                      </View>
                    );
                  })}
                </>
              )}
            </View>

            {/* Event Predictions */}
            <View style={styles.section}>
              <TouchableOpacity style={styles.toggleHeader} onPress={() => setShowPredictions(!showPredictions)}>
                <Text style={styles.sectionTitle}>🎯 Event Predictions</Text>
                {showPredictions ? <ChevronUp color={Colors.text} size={20} /> : <ChevronDown color={Colors.text} size={20} />}
              </TouchableOpacity>
              {showPredictions && chart.predictions.map((pred, i) => (
                <View key={i} style={[styles.predCard, { borderLeftColor: getStrengthColor(pred.strength) }]}>
                  <View style={styles.predHeader}>
                    <Text style={styles.predQuery}>{pred.query}</Text>
                    <View style={[styles.predBadge, { backgroundColor: getStrengthColor(pred.strength) }]}>
                      <Text style={styles.predBadgeText}>{pred.strength}</Text>
                    </View>
                  </View>
                  <Text style={styles.predVerdict}>{pred.verdict}</Text>
                  {pred.significators.length > 0 && (
                    <Text style={styles.predSig}>Timing planets: {pred.significators.join(', ')}</Text>
                  )}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Feature Lock Modal */}
      <FeatureLockModal
        visible={showLockModal}
        onClose={closeLockModal}
        featureName={lockedFeature?.name || ''}
        featureDescription={lockedFeature?.description}
        requiredTier={lockedFeature?.tier || currentTier}
        currentTier={currentTier}
        requiresSubscription={lockedFeature?.requiresSubscription}
        tierProgress={tierProgress}
      />
    </View>
    </FeatureErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingBottom: 16 },
  headerContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  infoButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerSub: { paddingHorizontal: 20, paddingTop: 10 },
  headerSubText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 2 },
  headerDesc: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },

  inputSection: {
    backgroundColor: Colors.white, padding: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  inputField: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 12, height: 44, gap: 8,
  },
  input: { flex: 1, fontSize: 14, color: Colors.text },
  calcButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, gap: 8, marginTop: 8,
  },
  calcButtonDisabled: { opacity: 0.6 },
  calcButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  infoCard: {
    margin: 16, padding: 16, backgroundColor: Colors.white,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
  },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  infoCardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  infoCardText: { fontSize: 13, color: Colors.textLight, lineHeight: 20, marginBottom: 12 },
  rulesList: { gap: 6 },
  ruleRow: { flexDirection: 'row', gap: 8 },
  ruleBullet: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  ruleText: { fontSize: 13, color: Colors.textLight, flex: 1, lineHeight: 18 },

  section: {
    margin: 16, marginBottom: 0, backgroundColor: Colors.white,
    borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, marginTop: 16,
  },
  toggleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },

  rulingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rulingItem: {
    width: '47%', backgroundColor: '#1E1B4B', borderRadius: 10, padding: 10,
    borderLeftWidth: 3, borderLeftColor: '#8B5CF6',
  },
  rulingLabel: { fontSize: 10, color: '#A5B4FC', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  rulingValue: { fontSize: 15, color: Colors.white, fontWeight: '700' },
  rulingFinal: {
    marginTop: 12, backgroundColor: '#F59E0B15', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#F59E0B40',
  },
  rulingFinalLabel: { fontSize: 11, color: '#F59E0B', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  rulingFinalValue: { fontSize: 14, color: Colors.text, fontWeight: '700' },

  tableHeader: {
    flexDirection: 'row', backgroundColor: Colors.primary + '15',
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 4, marginBottom: 2,
  },
  tableHeaderCell: { flex: 1, fontSize: 10, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 6 },
  tableRowAlt: { backgroundColor: Colors.background + '80' },
  tableRowSelected: { backgroundColor: Colors.primary + '15' },
  tableCell: { flex: 1, fontSize: 12, color: Colors.text, textAlign: 'center' },

  planetDetail: {
    marginTop: 12, backgroundColor: Colors.primary + '08', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.primary + '30',
  },
  planetDetailTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginBottom: 8 },
  planetDetailText: { fontSize: 13, color: Colors.text, lineHeight: 22 },

  predCard: {
    backgroundColor: Colors.background, borderRadius: 10, padding: 12,
    marginBottom: 8, borderLeftWidth: 4,
  },
  predHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  predQuery: { fontSize: 14, fontWeight: '700', color: Colors.text, flex: 1 },
  predBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  predBadgeText: { fontSize: 10, color: Colors.white, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  predVerdict: { fontSize: 12, color: Colors.textLight, lineHeight: 18, marginBottom: 4 },
  predSig: { fontSize: 11, color: '#8B5CF6', fontStyle: 'italic', marginTop: 2 },
});