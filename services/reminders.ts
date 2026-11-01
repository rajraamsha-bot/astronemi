/**
 * Reminders service — persists user reminders in Supabase and schedules
 * matching local notifications via `expo-notifications`. Everything is
 * best-effort; a Supabase outage or a notification-permission denial
 * shouldn't prevent the user from seeing their reminder list.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Logger } from './logger';

export type ReminderRepeat = 'daily' | 'weekly' | 'monthly' | 'once';
export type ReminderCategory = 'ritual' | 'horoscope' | 'festival' | 'transit' | 'custom';

export interface Reminder {
  id: string;
  title: string;
  category: ReminderCategory;
  repeatKind: ReminderRepeat;
  localTime: string; // HH:MM
  days: string[];
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  enabled: boolean;
  localNotificationId: string | null;
  createdAt: string;
}

export interface CreateReminderInput {
  title: string;
  category: ReminderCategory;
  repeatKind: ReminderRepeat;
  localTime: string;
  days?: string[];
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6, Sat: 7,
};

function parseHHMM(s: string): { hour: number; minute: number } {
  const [h, m] = s.split(':').map(n => Number(n));
  return { hour: Number.isFinite(h) ? (h ?? 0) : 0, minute: Number.isFinite(m) ? (m ?? 0) : 0 };
}

interface ReminderRow {
  id: string;
  title: string;
  category: string;
  repeat_kind: string;
  local_time: string;
  days: string[] | null;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  enabled: boolean;
  local_notification_id: string | null;
  created_at: string;
}

function mapRow(row: ReminderRow): Reminder {
  return {
    id: row.id,
    title: row.title,
    category: (row.category as ReminderCategory) ?? 'custom',
    repeatKind: (row.repeat_kind as ReminderRepeat) ?? 'daily',
    localTime: row.local_time ?? '08:00',
    days: row.days ?? [],
    soundEnabled: Boolean(row.sound_enabled),
    vibrationEnabled: Boolean(row.vibration_enabled),
    enabled: Boolean(row.enabled),
    localNotificationId: row.local_notification_id,
    createdAt: row.created_at,
  };
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return false;
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.status === 'granted';
  } catch (err) {
    Logger.warn('Notification permission check failed', err);
    return false;
  }
}

async function cancelLocal(id: string | null | undefined) {
  if (!id || Platform.OS === 'web') return;
  // Ids are stored comma-joined (weekly reminders schedule one notification
  // per selected weekday), so cancel every part.
  for (const part of id.split(',')) {
    const single = part.trim();
    if (!single) continue;
    try {
      await Notifications.cancelScheduledNotificationAsync(single);
    } catch {
      // already cancelled or OS doesn't know about it — ignore
    }
  }
}

async function scheduleLocal(reminder: Reminder): Promise<string | null> {
  if (Platform.OS === 'web' || !reminder.enabled) return null;

  const granted = await ensureNotificationPermissions();
  if (!granted) return null;

  const { hour, minute } = parseHHMM(reminder.localTime);
  const content: Notifications.NotificationContentInput = {
    title: reminder.title,
    body: reminder.category === 'custom' ? 'Reminder' : `Time for your ${reminder.category}.`,
    sound: reminder.soundEnabled ? 'default' : undefined,
  };

  const scheduleOne = (trigger: Notifications.NotificationTriggerInput) =>
    Notifications.scheduleNotificationAsync({ content, trigger });

  try {
    if (reminder.repeatKind === 'daily') {
      const id = await scheduleOne({
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      });
      return id;
    }

    if (reminder.repeatKind === 'weekly') {
      // Schedule EVERY selected weekday (the UI creates ONE reminder with a
      // multi-select day grid — the old code fired days[0] only, so
      // Mon+Wed+Fri reminders fired Monday alone).
      const weekdays = reminder.days
        .map(d => WEEKDAY_MAP[d])
        .filter((n): n is number => Number.isFinite(n));
      const list = weekdays.length > 0 ? weekdays : [2]; // default Monday
      const ids: string[] = [];
      for (const weekday of list) {
        ids.push(await scheduleOne({
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
        }));
      }
      return ids.join(',');
    }

    if (reminder.repeatKind === 'monthly') {
      const day = reminder.days[0] ? Number(reminder.days[0]) || 1 : 1;
      return await scheduleOne({
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day,
        hour,
        minute,
      });
    }

    // 'once' — fire at the NEXT occurrence of the local time. The old code
    // returned null, so one-shot reminders were persisted but never notified.
    const fireAt = new Date();
    fireAt.setHours(hour, minute, 0, 0);
    if (fireAt.getTime() <= Date.now()) {
      fireAt.setDate(fireAt.getDate() + 1);
    }
    return await scheduleOne({
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
    });
  } catch (err) {
    Logger.warn('Failed to schedule local notification', err);
    return null;
  }
}

export async function listReminders(userId: string, limit = 100): Promise<Reminder[]> {
  if (!isSupabaseConfigured() || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('user_reminders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(row => mapRow(row as ReminderRow));
  } catch (err) {
    Logger.error('Failed to list reminders', err);
    return [];
  }
}

export async function createReminder(
  userId: string,
  input: CreateReminderInput,
): Promise<Reminder | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('user_reminders')
      .insert({
        user_id: userId,
        title: input.title.trim(),
        category: input.category,
        repeat_kind: input.repeatKind,
        local_time: input.localTime,
        days: input.days ?? [],
        sound_enabled: input.soundEnabled ?? true,
        vibration_enabled: input.vibrationEnabled ?? true,
        enabled: true,
      })
      .select('*')
      .single();
    if (error) throw error;

    const reminder = mapRow(data as ReminderRow);
    const localId = await scheduleLocal(reminder);
    if (localId) {
      await supabase
        .from('user_reminders')
        .update({ local_notification_id: localId })
        .eq('id', reminder.id);
      reminder.localNotificationId = localId;
    }
    return reminder;
  } catch (err) {
    Logger.error('Failed to create reminder', err);
    return null;
  }
}

export async function toggleReminder(reminder: Reminder): Promise<Reminder | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const newEnabled = !reminder.enabled;
    await cancelLocal(reminder.localNotificationId);
    let localId: string | null = null;
    if (newEnabled) {
      localId = await scheduleLocal({ ...reminder, enabled: true });
    }

    const { data, error } = await supabase
      .from('user_reminders')
      .update({ enabled: newEnabled, local_notification_id: localId })
      .eq('id', reminder.id)
      .select('*')
      .single();
    if (error) throw error;
    return mapRow(data as ReminderRow);
  } catch (err) {
    Logger.error('Failed to toggle reminder', err);
    return null;
  }
}

export async function deleteReminder(reminder: Reminder): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    await cancelLocal(reminder.localNotificationId);
    const { error } = await supabase
      .from('user_reminders')
      .delete()
      .eq('id', reminder.id);
    if (error) throw error;
    return true;
  } catch (err) {
    Logger.error('Failed to delete reminder', err);
    return false;
  }
}
