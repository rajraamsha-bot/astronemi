import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Hash,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import {
  calculateKPHorary,
  predictKPEvent,
  calculateSignificators,
  enrichPlanetsKP,
  calculateKPEqualCusps,
  KPHoraryResult,
  KPEventPrediction,
} from '@/utils/kp-engine';
import { getKPSubLordInterpretation } from '@/utils/interpretations';
import { Logger } from '@/services/logger';

// KP Prashna (Horary) — the querent picks a number 1–249
// Each number maps to a unique sub-lord division of the zodiac
// The ascendant is set to that division's midpoint
// Then we analyze the relevant houses for the question

const QUICK_QUESTIONS = [
  { label: 'Will I get the job?', eventKey: 'career' },
  { label: 'Will I get married?', eventKey: 'marriage' },
  { label: 'Will my business succeed?', eventKey: 'finance' },
  { label: 'Will I travel abroad?', eventKey: 'travel' },
  { label: 'Will I recover from illness?', eventKey: 'health' },
  { label: 'Will I get a child?', eventKey: 'children' },
];

const EVENT_KEYS: Record<string, string> = {
  career:       'Career / Job',
  marriage:     'Marriage / Partnership',
  finance:      'Financial Gains',
  travel:       'Foreign Travel / Settlement',
  health:       'Health / Recovery',
  children:     'Children / Pregnancy',
  education:    'Education / Higher Studies',
  property:     'Property / Real Estate',
  spirituality: 'Spirituality / Moksha',
  litigation:   'Court Case / Legal Matters',
};

interface PrashnaResult {
  number: number;
  question: string;
  eventKey: string;
  horary: KPHoraryResult;
  prediction: KPEventPrediction;
  subLordMeaning: string;
}

export default function PrashnaKundliScreen() {
  const [number, setNumber] = useState('');
  const [question, setQuestion] = useState('');
  const [eventKey, setEventKey] = useState('career');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PrashnaResult | null>(null);

  const analyzePrashna = () => {
    const num = parseInt(number.trim(), 10);
    if (isNaN(num) || num < 1 || num > 249) {
      Alert.alert('Invalid Number', 'Please enter a number between 1 and 249.');
      return;
    }
    if (!question.trim()) {
      Alert.alert('No Question', 'Please enter your question.');
      return;
    }

    setIsAnalyzing(true);

    // KP Horary is 100% local — no async needed, but we add a small delay for UX
    setTimeout(() => {
      try {
    // Step 1: Get horary ascendant from the number
    const horary = calculateKPHorary(num);

    // Step 2: Get current transit positions for planets
    const now = new Date();
    const dt = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: now.getSeconds(),
    };
    
    // Default to New Delhi if no location provided
    const lat = 28.6139;
    const jd = (dt.year + (dt.month / 12) + (dt.day / 365)) > 2000 ? 
               (2451545.0 + (now.getTime() - new Date('2000-01-01T12:00:00Z').getTime()) / 86400000) : 2451545.0;
    const T = (jd - 2451545.0) / 36525.0;

    // Local ayanamsa calculation
    const ayanamsa = 23.85 + (T * 0.013); // Approx Lahiri

    // Real Transit Calculations
    const sunPos = { name: 'Sun', longitude: (280.46 + 36000.77 * T) % 360, house: 0, isRetrograde: false };
    const moonPos = { name: 'Moon', longitude: (218.31 + 481267.88 * T) % 360, house: 0, isRetrograde: false };
    const marsPos = { name: 'Mars', longitude: (355.43 + 19140.30 * T) % 360, house: 0, isRetrograde: false };
    const mercPos = { name: 'Mercury', longitude: (252.25 + 149472.67 * T) % 360, house: 0, isRetrograde: false };
    const jupPos = { name: 'Jupiter', longitude: (34.35 + 3034.90 * T) % 360, house: 0, isRetrograde: false };
    const venPos = { name: 'Venus', longitude: (181.98 + 58517.81 * T) % 360, house: 0, isRetrograde: false };
    const satPos = { name: 'Saturn', longitude: (50.07 + 1222.11 * T) % 360, house: 0, isRetrograde: false };
    const nodes = { rahu: (125.04 - 1934.13 * T) % 360, ketu: (125.04 - 1934.13 * T + 180) % 360 };

    const transitPlanets = [
       sunPos, moonPos, marsPos, mercPos, jupPos, venPos, satPos,
       { name: 'Rahu', longitude: nodes.rahu < 0 ? nodes.rahu + 360 : nodes.rahu, house: 0, isRetrograde: true },
       { name: 'Ketu', longitude: nodes.ketu < 0 ? nodes.ketu + 360 : nodes.ketu, house: 0, isRetrograde: true },
    ].map(p => ({ ...p, longitude: (p.longitude % 360 + 360) % 360 }));

    const cusps = calculateKPEqualCusps(horary.ascendantLongitude, lat, ayanamsa);
    const kpPlanets = enrichPlanetsKP(transitPlanets, cusps, ayanamsa);
    const significators = calculateSignificators(kpPlanets, cusps);
    const prediction = predictKPEvent(eventKey, kpPlanets, cusps, significators);

    const subLordMeaning = getKPSubLordInterpretation(horary.ascendantSubLord);

    setResult({ number: num, question: question.trim(), eventKey, horary, prediction, subLordMeaning });
  } catch (err) {
    Logger.error('Prashna error', err);
    Alert.alert('Analysis Error', 'Could not complete the horary analysis. Please check your inputs.');
  } finally {
    setIsAnalyzing(false);
  }
}, 1200);
};

  const reset = () => {
    setResult(null);
    setNumber('');
    setQuestion('');
    setEventKey('career');
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'Strong': return Colors.success;
      case 'Moderate': return Colors.gold;
      case 'Weak': return Colors.secondary;
      default: return Colors.error;
    }
  };

  const getStrengthIcon = (strength: string) => {
    switch (strength) {
      case 'Strong': return <CheckCircle size={20} color={Colors.success} />;
      case 'Moderate': return <AlertCircle size={20} color={Colors.gold} />;
      case 'Weak': return <AlertCircle size={20} color={Colors.secondary} />;
      default: return <XCircle size={20} color={Colors.error} />;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FF6B35', '#F7931E', '#FFB347']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color="#FFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>KP Prashna</Text>
            <TouchableOpacity style={styles.infoButton}>
              <HelpCircle color="#FFF" size={22} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <View style={styles.headerInfo}>
          <Text style={styles.headerSubtitle}>Horary Astrology — KP System</Text>
          <Text style={styles.headerDescription}>
            Pick a number 1–249, ask your question, get a precise KP answer
          </Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {!result ? (
            <View style={styles.formSection}>
              {/* Number Input */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Hash color={Colors.primary} size={20} />
                  <Text style={styles.cardTitle}>Step 1: Pick a Number</Text>
                </View>
                <Text style={styles.cardSubtitle}>
                  Close your eyes, think of your question, and pick any number between 1 and 249.
                  This is your Prashna number — it maps to a unique KP sub-lord division.
                </Text>
                <TextInput
                  style={styles.numberInput}
                  placeholder="Enter 1 – 249"
                  placeholderTextColor={Colors.textLight}
                  value={number}
                  onChangeText={setNumber}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>

              {/* Question */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Sparkles color={Colors.primary} size={20} />
                  <Text style={styles.cardTitle}>Step 2: Your Question</Text>
                </View>
                <TextInput
                  style={styles.questionInput}
                  placeholder="Type your question here..."
                  placeholderTextColor={Colors.textLight}
                  value={question}
                  onChangeText={setQuestion}
                  multiline
                  numberOfLines={3}
                />
                <Text style={styles.quickLabel}>Quick Questions:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.quickRow}>
                    {QUICK_QUESTIONS.map((q, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[styles.quickChip, eventKey === q.eventKey && styles.quickChipActive]}
                        onPress={() => { setQuestion(q.label); setEventKey(q.eventKey); }}
                      >
                        <Text style={[styles.quickChipText, eventKey === q.eventKey && styles.quickChipTextActive]}>
                          {q.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Event Category */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <AlertCircle color={Colors.primary} size={20} />
                  <Text style={styles.cardTitle}>Step 3: Question Category</Text>
                </View>
                <View style={styles.categoryGrid}>
                  {Object.entries(EVENT_KEYS).map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.categoryChip, eventKey === key && styles.categoryChipActive]}
                      onPress={() => setEventKey(key)}
                    >
                      <Text style={[styles.categoryText, eventKey === key && styles.categoryTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.analyzeButton, isAnalyzing && styles.analyzeButtonDisabled]}
                onPress={analyzePrashna}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Sparkles color="#FFF" size={20} />
                )}
                <Text style={styles.analyzeButtonText}>
                  {isAnalyzing ? 'Analyzing...' : 'Get KP Answer'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.resultSection}>
              {/* Question Summary */}
              <View style={styles.resultCard}>
                <Text style={styles.resultQuestion}>&quot;{result.question}&quot;</Text>
                <Text style={styles.resultMeta}>Prashna Number: {result.number} · Category: {EVENT_KEYS[result.eventKey]}</Text>
              </View>

              {/* Horary Ascendant */}
              <View style={styles.horaryCard}>
                <Text style={styles.sectionTitle}>🔮 KP Horary Ascendant</Text>
                <View style={styles.horaryGrid}>
                  <View style={styles.horaryItem}>
                    <Text style={styles.horaryLabel}>Ascendant Sign</Text>
                    <Text style={styles.horaryValue}>{result.horary.ascendantSign}</Text>
                  </View>
                  <View style={styles.horaryItem}>
                    <Text style={styles.horaryLabel}>Sign Lord</Text>
                    <Text style={styles.horaryValue}>{result.horary.ascendantSignLord}</Text>
                  </View>
                  <View style={styles.horaryItem}>
                    <Text style={styles.horaryLabel}>Star Lord</Text>
                    <Text style={styles.horaryValue}>{result.horary.ascendantStarLord}</Text>
                  </View>
                  <View style={styles.horaryItem}>
                    <Text style={styles.horaryLabel}>Sub Lord</Text>
                    <Text style={[styles.horaryValue, { color: Colors.primary }]}>
                      {result.horary.ascendantSubLord}
                    </Text>
                  </View>
                </View>
                <View style={styles.subLordBox}>
                  <Text style={styles.subLordTitle}>Sub-Lord Significance</Text>
                  <Text style={styles.subLordText}>{result.subLordMeaning}</Text>
                </View>
              </View>

              {/* KP Verdict */}
              <View style={[styles.verdictCard, { borderColor: getStrengthColor(result.prediction.strength) }]}>
                <View style={styles.verdictHeader}>
                  {getStrengthIcon(result.prediction.strength)}
                  <Text style={[styles.verdictStrength, { color: getStrengthColor(result.prediction.strength) }]}>
                    {result.prediction.strength.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.verdictText}>{result.prediction.verdict}</Text>
                {result.prediction.significators.length > 0 && (
                  <View style={styles.sigRow}>
                    <Text style={styles.sigLabel}>Timing Planets: </Text>
                    <Text style={styles.sigValue}>{result.prediction.significators.join(', ')}</Text>
                  </View>
                )}
                <View style={styles.sigRow}>
                  <Text style={styles.sigLabel}>Relevant Houses: </Text>
                  <Text style={styles.sigValue}>{result.prediction.houses.join(', ')}</Text>
                </View>
              </View>

              {/* KP Rules */}
              <View style={styles.rulesCard}>
                <Text style={styles.sectionTitle}>📖 How KP Prashna Works</Text>
                <Text style={styles.ruleText}>
                  1. Your number (1–249) maps to one of the 249 sub-lord divisions of the zodiac.
                </Text>
                <Text style={styles.ruleText}>
                  2. The ascendant is set to the midpoint of that division — giving Sign Lord → Star Lord → Sub Lord.
                </Text>
                <Text style={styles.ruleText}>
                  3. The Sub Lord of the ascendant is the final deciding factor. If it signifies the relevant houses, the event is promised.
                </Text>
                <Text style={styles.ruleText}>
                  4. For marriage: houses 2, 7, 11 must be signified. For career: 2, 6, 10, 11. For health: 1, 6, 8, 12.
                </Text>
              </View>

              <TouchableOpacity style={styles.resetButton} onPress={reset}>
                <RefreshCw color={Colors.primary} size={18} />
                <Text style={styles.resetButtonText}>Ask Another Question</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingBottom: 20 },
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
  headerInfo: { paddingHorizontal: 20, paddingTop: 16 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  headerDescription: { fontSize: 15, color: '#FFF', fontWeight: '500' },

  formSection: { padding: 16 },
  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  cardSubtitle: { fontSize: 13, color: Colors.textLight, lineHeight: 20, marginBottom: 12 },
  numberInput: {
    backgroundColor: Colors.background, borderRadius: 12, padding: 16,
    fontSize: 28, fontWeight: '700', color: Colors.primary, textAlign: 'center',
    borderWidth: 2, borderColor: Colors.primary + '40',
  },
  questionInput: {
    backgroundColor: Colors.background, borderRadius: 12, padding: 14,
    fontSize: 15, color: Colors.text, minHeight: 80, textAlignVertical: 'top',
    marginBottom: 12,
  },
  quickLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  quickRow: { flexDirection: 'row', gap: 8 },
  quickChip: {
    backgroundColor: Colors.background, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
  },
  quickChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  quickChipText: { fontSize: 12, color: Colors.text },
  quickChipTextActive: { color: Colors.white, fontWeight: '600' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    backgroundColor: Colors.background, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
  },
  categoryChipActive: { backgroundColor: Colors.primary + '15', borderColor: Colors.primary },
  categoryText: { fontSize: 12, color: Colors.textLight },
  categoryTextActive: { color: Colors.primary, fontWeight: '600' },
  analyzeButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FF6B35', paddingVertical: 16, borderRadius: 14, gap: 8,
  },
  analyzeButtonDisabled: { backgroundColor: Colors.textLight },
  analyzeButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  resultSection: { padding: 16 },
  resultCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 16,
    borderLeftWidth: 4, borderLeftColor: '#FF6B35',
  },
  resultQuestion: { fontSize: 16, fontWeight: '600', color: Colors.text, fontStyle: 'italic', marginBottom: 6 },
  resultMeta: { fontSize: 12, color: Colors.textLight },
  horaryCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  horaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  horaryItem: {
    width: '47%', backgroundColor: Colors.background, borderRadius: 10, padding: 12,
  },
  horaryLabel: { fontSize: 11, color: Colors.textLight, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  horaryValue: { fontSize: 16, fontWeight: '700', color: Colors.text },
  subLordBox: {
    backgroundColor: Colors.primary + '10', borderRadius: 10, padding: 12,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  subLordTitle: { fontSize: 12, fontWeight: '700', color: Colors.primary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  subLordText: { fontSize: 13, color: Colors.text, lineHeight: 20 },
  verdictCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 2,
  },
  verdictHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  verdictStrength: { fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  verdictText: { fontSize: 14, color: Colors.text, lineHeight: 22, marginBottom: 12 },
  sigRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  sigLabel: { fontSize: 12, color: Colors.textLight, fontWeight: '600' },
  sigValue: { fontSize: 12, color: Colors.text, fontWeight: '700' },
  rulesCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  ruleText: { fontSize: 13, color: Colors.textLight, lineHeight: 20, marginBottom: 8 },
  resetButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.white, paddingVertical: 14, borderRadius: 12, gap: 8,
    borderWidth: 2, borderColor: Colors.primary,
  },
  resetButtonText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
});
