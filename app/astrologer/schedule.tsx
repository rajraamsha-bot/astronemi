import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft, Plus, Trash2, Clock,
  ChevronDown,
} from 'lucide-react-native';
import { astrologerDashboard } from '@/services/astrologer-dashboard';
import { Logger } from '@/services/logger';
import type { AvailabilitySlot } from '@/types/astrologer-dashboard';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseTimeInput(t: string): string | null {
  const m = t.match(/^([0-9]{1,2}):([0-9]{2})$/);
  if (!m) return null;
  const h = parseInt(m[1] ?? '', 10);
  const min = parseInt(m[2] ?? '', 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

export default function AstrologerScheduleScreen() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await astrologerDashboard.getAvailability();
      setSlots(data);
      setLoadFailed(false);
    } catch (e) {
      Logger.error('Failed to load availability', e);
      // Keep loadFailed set: rendering "No slots set" after a failed load
      // used to invite pressing Save, which would REPLACE the real DB
      // schedule with the empty local list.
      setLoadFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const daySlots = (day: number) => slots.filter((s) => s.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const handleAddSlot = (day: number) => {
    const s = parseTimeInput(newStart.trim());
    const e = parseTimeInput(newEnd.trim());
    if (!s || !e) {
      Alert.alert('Invalid time', 'Use HH:MM format (e.g. 09:00)');
      return;
    }
    if (s >= e) {
      Alert.alert('Invalid range', 'Start time must be before end time');
      return;
    }
    const id = `local-${Date.now()}`;
    setSlots((prev) => [...prev, { id, dayOfWeek: day as 0|1|2|3|4|5|6, startTime: s, endTime: e, isRecurring: true }]);
    setNewStart('');
    setNewEnd('');
  };

  const handleRemoveSlot = (id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSave = async () => {
    if (loadFailed && slots.length === 0) {
      // Saving an empty list is destructive (it replaces the whole weekly
      // schedule); refuse when the list is empty BECAUSE the load failed.
      Alert.alert('Schedule not loaded', 'Your schedule could not be loaded, so saving now would erase it. Pull to refresh and try again.');
      return;
    }
    setSaving(true);
    const result = await astrologerDashboard.setAvailability(
      slots.map((s) => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, isRecurring: s.isRecurring }))
    );
    setSaving(false);
    if (result.success) {
      setLoadFailed(false);
      Alert.alert('Saved', 'Your weekly schedule has been updated.');
    } else {
      Alert.alert('Error', result.error || 'Failed to save schedule');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#6B46C1" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6B46C1" />
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.content}
        >
          <Text style={styles.subtitle}>Tap a day to add or remove time slots.</Text>

          {DAYS.map((_dayLabel, dayIndex) => {
            const ds = daySlots(dayIndex);
            const isExpanded = expandedDay === dayIndex;
            return (
              <View key={dayIndex} style={styles.dayCard}>
                <TouchableOpacity
                  style={styles.dayHeader}
                  onPress={() => setExpandedDay(isExpanded ? null : dayIndex)}
                >
                  <View style={styles.dayHeaderLeft}>
                    <Text style={styles.dayName}>{DAY_LABELS[dayIndex]}</Text>
                    <Text style={styles.dayCount}>{ds.length} slot{ds.length !== 1 ? 's' : ''}</Text>
                  </View>
                  <ChevronDown size={20} color="#6B7280" style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.dayBody}>
                    {ds.length === 0 && (
                      <Text style={styles.emptySlotText}>No slots set</Text>
                    )}
                    {ds.map((slot) => (
                      <View key={slot.id} style={styles.slotRow}>
                        <View style={styles.slotTimeWrap}>
                          <Clock size={14} color="#6B46C1" />
                          <Text style={styles.slotTime}>{slot.startTime} – {slot.endTime}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleRemoveSlot(slot.id)}>
                          <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}

                    {/* Add new slot */}
                    <View style={styles.addRow}>
                      <TextInput
                        style={styles.timeInput}
                        placeholder="09:00"
                        placeholderTextColor="#9CA3AF"
                        value={newStart}
                        onChangeText={setNewStart}
                        maxLength={5}
                        keyboardType="numbers-and-punctuation"
                      />
                      <Text style={styles.toText}>to</Text>
                      <TextInput
                        style={styles.timeInput}
                        placeholder="17:00"
                        placeholderTextColor="#9CA3AF"
                        value={newEnd}
                        onChangeText={setNewEnd}
                        maxLength={5}
                        keyboardType="numbers-and-punctuation"
                      />
                      <TouchableOpacity style={styles.addBtn} onPress={() => handleAddSlot(dayIndex)}>
                        <Plus size={16} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F4FF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E5EA',
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  saveButton: { paddingHorizontal: 14, paddingVertical: 6 },
  saveButtonText: { fontSize: 15, fontWeight: '700', color: '#6B46C1' },
  content: { padding: 16, paddingBottom: 40 },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  dayCard: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E5E5EA', overflow: 'hidden' },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  dayHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  dayCount: { fontSize: 12, color: '#6B7280' },
  dayBody: { paddingHorizontal: 16, paddingBottom: 14 },
  emptySlotText: { fontSize: 13, color: '#9CA3AF', marginBottom: 8 },
  slotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  slotTimeWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotTime: { fontSize: 14, fontWeight: '600', color: '#374151' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  timeInput: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', textAlign: 'center' },
  toText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#6B46C1', alignItems: 'center', justifyContent: 'center' },
});
