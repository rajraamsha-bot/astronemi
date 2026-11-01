/**
 * Reminders — Supabase-backed list + local notifications scheduled via
 * expo-notifications. Creating a reminder persists the row, then
 * schedules the matching daily/weekly/monthly trigger on-device.
 */

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Bell,
  Calendar,
  Clock,
  Moon,
  Plus,
  Star,
  Sun,
  Trash2,
  Vibrate,
  Volume2,
  X,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';
import {
  useCreateReminder,
  useDeleteReminder,
  useReminders,
  useToggleReminder,
} from '@/hooks/queries/useReminders';
import type { Reminder, ReminderCategory, ReminderRepeat } from '@/services/reminders';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';

const CATEGORIES: {
  id: ReminderCategory;
  label: string;
  icon: typeof Bell;
  color: string;
}[] = [
  { id: 'ritual', label: 'Rituals & practices', icon: Sun, color: '#FFD700' },
  { id: 'horoscope', label: 'Horoscope updates', icon: Star, color: '#9C27B0' },
  { id: 'festival', label: 'Festival reminders', icon: Calendar, color: '#FF9800' },
  { id: 'transit', label: 'Transit alerts', icon: Moon, color: '#2196F3' },
  { id: 'custom', label: 'Custom reminder', icon: Bell, color: '#4CAF50' },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function categoryMeta(category: ReminderCategory) {
  return CATEGORIES.find(c => c.id === category) ?? CATEGORIES[4]!;
}

function repeatLabel(r: Reminder): string {
  switch (r.repeatKind) {
    case 'daily':
      return 'Every day';
    case 'weekly':
      return r.days.length ? `Every ${r.days.join(', ')}` : 'Weekly';
    case 'monthly':
      return r.days.length ? `Monthly on ${r.days.join(', ')}` : 'Monthly';
    case 'once':
      return 'One time';
  }
}

export default function RemindersScreen() {
  const { user } = useUser();
  const { data: reminders = [], isLoading, refetch, isRefetching } = useReminders(user?.id);
  const createReminder = useCreateReminder(user?.id);
  const toggleReminder = useToggleReminder(user?.id);
  const deleteReminder = useDeleteReminder(user?.id);

  const [showAdd, setShowAdd] = useState(false);

  const stats = useMemo(
    () => ({
      total: reminders.length,
      active: reminders.filter(r => r.enabled).length,
      daily: reminders.filter(r => r.repeatKind === 'daily').length,
    }),
    [reminders],
  );

  const handleToggle = (reminder: Reminder) => {
    toggleReminder.mutate(reminder);
  };

  const handleDelete = (reminder: Reminder) => {
    Alert.alert('Delete reminder', `Remove "${reminder.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteReminder.mutate(reminder),
      },
    ]);
  };

  return (
    <FeatureErrorBoundary featureName="Reminders">
    <View style={styles.container}>
      <LinearGradient colors={['#E91E63', '#F06292', '#F48FB1']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerBar}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <ArrowLeft color="#FFF" size={22} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Reminders</Text>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                if (!user) {
                  Alert.alert('Sign in required', 'Sign in to schedule reminders.');
                  return;
                }
                setShowAdd(true);
              }}
              accessibilityLabel="Add reminder"
            >
              <Plus color="#FFF" size={22} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Set gentle nudges for rituals, horoscopes, and transits.</Text>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Bell color="#E91E63" size={22} />
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Sun color="#4CAF50" size={22} />
          <Text style={styles.statValue}>{stats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Moon color="#9C27B0" size={22} />
          <Text style={styles.statValue}>{stats.daily}</Text>
          <Text style={styles.statLabel}>Daily</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color="#E91E63" />
        </View>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={r => r.id}
          contentContainerStyle={styles.list}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.stateBox}>
              <Bell color={Colors.textLight} size={40} />
              <Text style={styles.stateTitle}>No reminders yet</Text>
              <Text style={styles.stateText}>
                Tap the plus button to set your first one.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ReminderRow
              reminder={item}
              onToggle={() => handleToggle(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}

      <AddReminderModal
        visible={showAdd}
        isSubmitting={createReminder.isPending}
        onClose={() => setShowAdd(false)}
        onSubmit={async input => {
          try {
            await createReminder.mutateAsync(input);
            setShowAdd(false);
          } catch (err) {
            Alert.alert('Could not save', (err as Error).message || 'Please try again.');
          }
        }}
      />
    </View>
    </FeatureErrorBoundary>
  );
}

function ReminderRow({
  reminder,
  onToggle,
  onDelete,
}: {
  reminder: Reminder;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const meta = categoryMeta(reminder.category);
  const Icon = meta.icon;
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: `${meta.color}20` }]}>
        <Icon color={meta.color} size={20} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{reminder.title}</Text>
        <View style={styles.rowMeta}>
          <Clock color={Colors.textLight} size={12} />
          <Text style={styles.rowMetaText}>{reminder.localTime}</Text>
          <Text style={styles.rowMetaDot}>·</Text>
          <Text style={styles.rowMetaText}>{repeatLabel(reminder)}</Text>
        </View>
        <View style={styles.rowBadges}>
          {reminder.soundEnabled && (
            <View style={styles.badge}>
              <Volume2 color="#E91E63" size={10} />
              <Text style={styles.badgeText}>Sound</Text>
            </View>
          )}
          {reminder.vibrationEnabled && (
            <View style={styles.badge}>
              <Vibrate color="#E91E63" size={10} />
              <Text style={styles.badgeText}>Vibrate</Text>
            </View>
          )}
          {reminder.localNotificationId == null && reminder.enabled && (
            <View style={[styles.badge, { backgroundColor: '#FFEBEE' }]}>
              <Text style={[styles.badgeText, { color: '#E53935' }]}>
                Not scheduled on device
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Switch
          value={reminder.enabled}
          onValueChange={onToggle}
          trackColor={{ false: Colors.border, true: `${Colors.primary}60` }}
          thumbColor={reminder.enabled ? Colors.primary : Colors.textLight}
        />
        <TouchableOpacity onPress={onDelete} accessibilityLabel="Delete reminder">
          <Trash2 color="#F44336" size={16} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AddReminderModal({
  visible,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    category: ReminderCategory;
    repeatKind: ReminderRepeat;
    localTime: string;
    days: string[];
    soundEnabled: boolean;
    vibrationEnabled: boolean;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('08:00');
  const [repeat, setRepeat] = useState<ReminderRepeat>('daily');
  const [category, setCategory] = useState<ReminderCategory>('custom');
  const [days, setDays] = useState<string[]>(['Mon']);
  const [sound, setSound] = useState(true);
  const [vibration, setVibration] = useState(true);

  const reset = () => {
    setTitle('');
    setTime('08:00');
    setRepeat('daily');
    setCategory('custom');
    setDays(['Mon']);
    setSound(true);
    setVibration(true);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const save = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Give your reminder a name.');
      return;
    }
    await onSubmit({
      title,
      category,
      repeatKind: repeat,
      localTime: time,
      days: repeat === 'weekly' || repeat === 'monthly' ? days : [],
      soundEnabled: sound,
      vibrationEnabled: vibration,
    });
    reset();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={handleClose} accessibilityLabel="Close">
            <X color={Colors.text} size={22} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>New reminder</Text>
          <TouchableOpacity onPress={save} disabled={isSubmitting} accessibilityRole="button">
            {isSubmitting ? <ActivityIndicator color="#E91E63" /> : <Text style={styles.modalSave}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalBody}>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.chip,
                  category === c.id && { backgroundColor: c.color, borderColor: c.color },
                ]}
                onPress={() => setCategory(c.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    category === c.id && styles.chipTextActive,
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Morning Surya Namaskar"
            placeholderTextColor={Colors.textLight}
            maxLength={120}
          />

          <Text style={styles.label}>Time (HH:MM)</Text>
          <TextInput
            style={styles.input}
            value={time}
            onChangeText={setTime}
            placeholder="08:00"
            placeholderTextColor={Colors.textLight}
            maxLength={5}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={styles.label}>Repeat</Text>
          <View style={styles.repeatRow}>
            {(['daily', 'weekly', 'monthly', 'once'] as ReminderRepeat[]).map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.repeatChip, repeat === r && styles.repeatChipActive]}
                onPress={() => setRepeat(r)}
              >
                <Text
                  style={[styles.repeatText, repeat === r && styles.repeatTextActive]}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {repeat === 'weekly' && (
            <>
              <Text style={styles.label}>Days</Text>
              <View style={styles.daysGrid}>
                {WEEKDAYS.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayBtn, days.includes(d) && styles.dayBtnActive]}
                    onPress={() =>
                      setDays(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]))
                    }
                  >
                    <Text style={[styles.dayText, days.includes(d) && styles.dayTextActive]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {repeat === 'monthly' && (
            <>
              <Text style={styles.label}>Day of month</Text>
              <View style={styles.daysGrid}>
                {Array.from({ length: 28 }, (_, i) => String(i + 1)).map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayBtn, days.includes(d) && styles.dayBtnActive]}
                    onPress={() => setDays([d])}
                  >
                    <Text style={[styles.dayText, days.includes(d) && styles.dayTextActive]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={styles.label}>Options</Text>
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={[styles.optBtn, sound && styles.optBtnActive]}
              onPress={() => setSound(s => !s)}
            >
              <Volume2 color={sound ? '#E91E63' : Colors.textLight} size={16} />
              <Text style={[styles.optText, sound && { color: '#E91E63' }]}>Sound</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optBtn, vibration && styles.optBtnActive]}
              onPress={() => setVibration(v => !v)}
            >
              <Vibrate color={vibration ? '#E91E63' : Colors.textLight} size={16} />
              <Text style={[styles.optText, vibration && { color: '#E91E63' }]}>Vibrate</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
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
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.text, marginTop: 6 },
  statLabel: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  list: { padding: 16, paddingTop: 16, paddingBottom: 60 },
  stateBox: { padding: 40, alignItems: 'center', gap: 8 },
  stateTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 8 },
  stateText: { fontSize: 13, color: Colors.textLight, textAlign: 'center' },

  row: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    gap: 12,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  rowMetaText: { fontSize: 11, color: Colors.textLight },
  rowMetaDot: { color: Colors.textLight, marginHorizontal: 2 },
  rowBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FCE4EC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  badgeText: { fontSize: 9, color: '#E91E63', fontWeight: '700' },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  modalSave: { color: '#E91E63', fontSize: 15, fontWeight: '700' },
  modalBody: { padding: 16, gap: 12, paddingBottom: 48 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.text, marginTop: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: Colors.white,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.text },
  chipTextActive: { color: '#FFF' },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  repeatRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  repeatChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  repeatChipActive: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
  repeatText: { fontSize: 12, fontWeight: '600', color: Colors.text },
  repeatTextActive: { color: '#FFF' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayBtnActive: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
  dayText: { fontSize: 11, color: Colors.text, fontWeight: '600' },
  dayTextActive: { color: '#FFF' },
  optionsRow: { flexDirection: 'row', gap: 8 },
  optBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optBtnActive: { borderColor: '#E91E63' },
  optText: { fontSize: 13, fontWeight: '600', color: Colors.textLight },
});
