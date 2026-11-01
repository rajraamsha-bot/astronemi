/**
 * Dream interpretation — sends the user's dream to a Supabase Edge Function
 * and stores each interpretation in their private dream journal. Falls
 * back to an offline keyword heuristic when the service is unavailable.
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Moon,
  Sparkles,
  Star,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';
import {
  interpretDream,
  listDreamEntries,
  saveDreamEntry,
  type DreamEntry,
  type DreamInterpretation,
} from '@/services/dream-interpretation';
import { relativeTime } from '@/services/cms';
import { Logger } from '@/services/logger';
import { AI_FEATURES_ENABLED } from '@/config/ai-features';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';

export default function DreamsScreen() {
  const { user } = useUser();
  const [description, setDescription] = useState('');
  const [interpretation, setInterpretation] = useState<DreamInterpretation | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [entries, setEntries] = useState<DreamEntry[]>([]);
  const [loadingJournal, setLoadingJournal] = useState(false);
  const [journalError, setJournalError] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    setLoadingJournal(true);
    listDreamEntries(user.id).then(rows => {
      if (!cancelled) {
        setEntries(rows);
        setLoadingJournal(false);
      }
    }).catch((err) => {
      if (!cancelled) {
        Logger.error('Failed to load dream journal', err);
        setJournalError(true);
        setLoadingJournal(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const analyze = async () => {
    if (!description.trim()) {
      Alert.alert('Describe your dream', 'Write a few sentences about what you saw and felt.');
      return;
    }
    setAnalyzing(true);
    try {
      const result = await interpretDream(description);
      setInterpretation(result);
      if (user?.id) {
        const entry = await saveDreamEntry(user.id, description, result);
        if (entry) {
          setEntries(prev => [entry, ...prev]);
        } else {
          // saveDreamEntry returns null on failure (it swallows the error);
          // the interpretation is shown, so tell the user it was NOT saved
          // to their journal instead of silently losing it.
          Alert.alert(
            'Journal not saved',
            'Your interpretation is shown below, but it could not be saved to your dream journal. Please try again later.'
          );
        }
      }
    } catch (err) {
      Alert.alert('Could not analyse', (err as Error).message || 'Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <FeatureErrorBoundary featureName="Dreams">
    <View style={styles.container}>
      <LinearGradient colors={['#1A237E', '#283593', '#3949AB']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerBar}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <ArrowLeft color="#FFF" size={22} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Dream Interpretation</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.subtitle}>
            {AI_FEATURES_ENABLED
              ? 'Describe your dream; an AI guided by Vedic and Jungian symbolism will interpret it.'
              : 'Describe your dream for symbolic guidance grounded in Vedic and Jungian themes.'}
          </Text>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.inputCard}>
            <Text style={styles.sectionTitle}>Describe your dream</Text>
            <TextInput
              style={styles.input}
              placeholder="I was swimming in a river at night. A large bird circled above. I felt calm but alert..."
              placeholderTextColor={Colors.textLight}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.analyzeBtn, analyzing && styles.analyzeBtnDisabled]}
              onPress={analyze}
              disabled={analyzing}
              accessibilityRole="button"
            >
              {analyzing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Sparkles color="#FFF" size={18} />
                  <Text style={styles.analyzeText}>Interpret my dream</Text>
                </>
              )}
            </TouchableOpacity>
            {!user && (
              <Text style={styles.signInHint}>
                Sign in to save interpretations to your dream journal.
              </Text>
            )}
          </View>

          {interpretation && <InterpretationCard interpretation={interpretation} />}

          <View style={styles.journalCard}>
            <View style={styles.journalHeader}>
              <BookOpen color={Colors.primary} size={18} />
              <Text style={styles.sectionTitle}>Your dream journal</Text>
            </View>
            {loadingJournal ? (
              <ActivityIndicator color={Colors.primary} style={{ padding: 20 }} />
            ) : journalError ? (
              <Text style={styles.journalEmpty}>
                Your dream journal could not be loaded. Pull down or try again later.
              </Text>
            ) : entries.length === 0 ? (
              <Text style={styles.journalEmpty}>
                Your interpretations will appear here after your first dream entry.
              </Text>
            ) : (
              <FlatList
                data={entries}
                scrollEnabled={false}
                keyExtractor={e => e.id}
                renderItem={({ item }) => <JournalEntry entry={item} />}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
    </FeatureErrorBoundary>
  );
}

function InterpretationCard({ interpretation }: { interpretation: DreamInterpretation }) {
  return (
    <View style={styles.interpretation}>
      <View style={styles.interpretationHeader}>
        <Moon color="#1A237E" size={28} />
        <Text style={styles.interpretationTitle}>Your dream reveals</Text>
        {interpretation.source === 'offline' && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineText}>offline</Text>
          </View>
        )}
      </View>

      <Text style={styles.moodLabel}>Overall mood</Text>
      <Text style={styles.moodText}>{interpretation.mood}</Text>

      <Text style={styles.blockLabel}>Symbols</Text>
      {interpretation.symbols.map(s => (
        <View key={s.symbol} style={styles.symbolRow}>
          <Star color="#FFD700" size={14} fill="#FFD700" />
          <View style={{ flex: 1 }}>
            <Text style={styles.symbolName}>{s.symbol}</Text>
            <Text style={styles.symbolMeaning}>{s.meaning}</Text>
          </View>
        </View>
      ))}

      <Text style={styles.blockLabel}>Overall meaning</Text>
      <Text style={styles.paragraph}>{interpretation.overallMeaning}</Text>

      <Text style={styles.blockLabel}>Guidance</Text>
      <Text style={styles.paragraph}>{interpretation.guidance}</Text>

      {interpretation.warning && (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Gentle caution</Text>
          <Text style={styles.warningText}>{interpretation.warning}</Text>
        </View>
      )}

      {interpretation.opportunity && (
        <View style={styles.opportunityBox}>
          <Text style={styles.opportunityTitle}>Opportunity</Text>
          <Text style={styles.opportunityText}>{interpretation.opportunity}</Text>
        </View>
      )}
    </View>
  );
}

function JournalEntry({ entry }: { entry: DreamEntry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity style={styles.entry} onPress={() => setExpanded(v => !v)} activeOpacity={0.85}>
      <View style={styles.entryHeader}>
        <Clock color={Colors.textLight} size={12} />
        <Text style={styles.entryTime}>{relativeTime(entry.createdAt)}</Text>
        {entry.mood && (
          <View style={styles.moodPill}>
            <Text style={styles.moodPillText}>{entry.mood}</Text>
          </View>
        )}
      </View>
      <Text style={styles.entryDescription} numberOfLines={expanded ? undefined : 2}>
        {entry.description}
      </Text>
      {expanded && entry.interpretation && (
        <View style={{ gap: 8, marginTop: 8 }}>
          <Text style={styles.entryMeaning}>{entry.interpretation.overallMeaning}</Text>
          {entry.interpretation.guidance && (
            <Text style={styles.entryGuidance}>{entry.interpretation.guidance}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingBottom: 20 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    lineHeight: 18,
  },
  body: { padding: 16, paddingBottom: 40, gap: 16 },

  inputCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  input: {
    minHeight: 120,
    borderRadius: 10,
    backgroundColor: Colors.background,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  analyzeBtn: {
    backgroundColor: '#1A237E',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  analyzeBtnDisabled: { opacity: 0.7 },
  analyzeText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  signInHint: { fontSize: 11, color: Colors.textLight, textAlign: 'center' },

  interpretation: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1A237E30',
    gap: 6,
  },
  interpretationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  interpretationTitle: { fontSize: 16, fontWeight: '800', color: '#1A237E', flex: 1 },
  offlineBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  offlineText: { fontSize: 10, color: '#E65100', fontWeight: '700' },
  moodLabel: { fontSize: 11, color: Colors.textLight, fontWeight: '700', letterSpacing: 1 },
  moodText: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  blockLabel: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 8,
  },
  paragraph: { fontSize: 13, color: Colors.text, lineHeight: 19 },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  symbolName: { fontSize: 13, fontWeight: '700', color: Colors.text },
  symbolMeaning: { fontSize: 12, color: Colors.textLight, marginTop: 2, lineHeight: 16 },
  warningBox: {
    marginTop: 10,
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#F44336',
  },
  warningTitle: { fontSize: 12, color: '#F44336', fontWeight: '700' },
  warningText: { fontSize: 12, color: Colors.text, marginTop: 4, lineHeight: 17 },
  opportunityBox: {
    marginTop: 8,
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  opportunityTitle: { fontSize: 12, color: '#2E7D32', fontWeight: '700' },
  opportunityText: { fontSize: 12, color: Colors.text, marginTop: 4, lineHeight: 17 },

  journalCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  journalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  journalEmpty: { fontSize: 12, color: Colors.textLight, paddingVertical: 16, textAlign: 'center' },
  entry: {
    backgroundColor: Colors.background,
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    gap: 4,
  },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  entryTime: { fontSize: 10, color: Colors.textLight },
  moodPill: {
    backgroundColor: '#E8EAF6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 4,
  },
  moodPillText: { fontSize: 10, color: '#1A237E', fontWeight: '700' },
  entryDescription: { fontSize: 12, color: Colors.text, lineHeight: 17 },
  entryMeaning: { fontSize: 12, color: Colors.text, lineHeight: 17 },
  entryGuidance: { fontSize: 12, color: Colors.textLight, lineHeight: 17, fontStyle: 'italic' },
});
