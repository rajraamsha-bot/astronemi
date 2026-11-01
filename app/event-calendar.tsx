/**
 * Event calendar — reads the admin-maintained astro_events table and
 * lets signed-in users bookmark events. Filters by kind (transit,
 * festival, eclipse, retrograde, workshop).
 */

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  CalendarClock,
  MapPin,
  Users,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';
import {
  useAstroEvents,
  useToggleEventBookmark,
} from '@/hooks/queries/useAstroEvents';
import type { AstroEvent, AstroEventKind } from '@/services/astro-events';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';

const KIND_FILTERS: { id: AstroEventKind | 'all'; label: string; color: string }[] = [
  { id: 'all', label: 'All', color: Colors.primary },
  { id: 'transit', label: 'Transits', color: '#2196F3' },
  { id: 'festival', label: 'Festivals', color: '#FF9800' },
  { id: 'eclipse', label: 'Eclipses', color: '#7E57C2' },
  { id: 'retrograde', label: 'Retrogrades', color: '#E53935' },
  { id: 'workshop', label: 'Workshops', color: '#4CAF50' },
];

function formatDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

function kindColor(kind: AstroEventKind): string {
  return KIND_FILTERS.find(k => k.id === kind)?.color ?? Colors.primary;
}

export default function EventCalendarScreen() {
  const { user } = useUser();
  const [kind, setKind] = useState<AstroEventKind | 'all'>('all');

  const { data: events = [], isLoading, refetch, isRefetching } = useAstroEvents({
    kind,
    userId: user?.id,
  });

  const toggleBookmark = useToggleEventBookmark(user?.id);

  const months = useMemo(() => {
    const by = new Map<string, AstroEvent[]>();
    events.forEach(e => {
      const label = new Date(e.occursAt).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      });
      if (!by.has(label)) by.set(label, []);
      by.get(label)!.push(e);
    });
    return Array.from(by.entries());
  }, [events]);

  const handleBookmark = (event: AstroEvent) => {
    if (!user) {
      Alert.alert('Sign in required', 'Sign in to bookmark events.');
      return;
    }
    toggleBookmark.mutate(event.id);
  };

  return (
    <FeatureErrorBoundary featureName="Event Calendar">
    <View style={styles.container}>
      <LinearGradient colors={['#4A148C', '#6A1B9A', '#8E24AA']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerBar}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <ArrowLeft color="#FFF" size={22} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Astro Calendar</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.subtitle}>Transits, eclipses, festivals, and workshops.</Text>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.filterBar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={KIND_FILTERS}
          keyExtractor={k => k.id}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.chip,
                kind === item.id && { backgroundColor: item.color, borderColor: item.color },
              ]}
              onPress={() => setKind(item.id)}
            >
              <Text style={[styles.chipText, kind === item.id && styles.chipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.stateBox}>
          <CalendarClock color={Colors.textLight} size={40} />
          <Text style={styles.stateTitle}>No upcoming events</Text>
          <Text style={styles.stateText}>
            Check back as new transits, eclipses, and festivals are scheduled.
          </Text>
        </View>
      ) : (
        <FlatList
          data={months}
          keyExtractor={([label]) => label}
          contentContainerStyle={styles.list}
          refreshing={isRefetching}
          onRefresh={refetch}
          renderItem={({ item: [label, monthEvents] }) => (
            <View style={styles.monthBlock}>
              <Text style={styles.monthHeading}>{label}</Text>
              {monthEvents.map(e => (
                <EventCard key={e.id} event={e} onBookmark={() => handleBookmark(e)} />
              ))}
            </View>
          )}
        />
      )}
    </View>
    </FeatureErrorBoundary>
  );
}

function EventCard({
  event,
  onBookmark,
}: {
  event: AstroEvent;
  onBookmark: () => void;
}) {
  const { date, time } = formatDate(event.occursAt);
  const color = kindColor(event.kind);

  return (
    <View style={styles.card}>
      {event.imageUrl && <Image source={{ uri: event.imageUrl }} style={styles.cover} />}
      <View style={styles.body}>
        <View style={styles.kindRow}>
          <View style={[styles.kindBadge, { backgroundColor: `${color}18`, borderColor: color }]}>
            <Text style={[styles.kindText, { color }]}>{event.kind.toUpperCase()}</Text>
          </View>
          <TouchableOpacity onPress={onBookmark} accessibilityLabel="Toggle bookmark">
            <Bookmark
              color={event.isBookmarked ? Colors.primary : Colors.textLight}
              size={18}
              fill={event.isBookmarked ? Colors.primary : 'transparent'}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{event.title}</Text>
        {event.description && (
          <Text style={styles.description} numberOfLines={3}>
            {event.description}
          </Text>
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Calendar color={Colors.textLight} size={12} />
            <Text style={styles.metaText}>{date}</Text>
          </View>
          <View style={styles.metaItem}>
            <CalendarClock color={Colors.textLight} size={12} />
            <Text style={styles.metaText}>{time}</Text>
          </View>
          {event.location && (
            <View style={styles.metaItem}>
              <MapPin color={Colors.textLight} size={12} />
              <Text style={styles.metaText}>{event.location}</Text>
            </View>
          )}
          {event.expectedParticipants > 0 && (
            <View style={styles.metaItem}>
              <Users color={Colors.textLight} size={12} />
              <Text style={styles.metaText}>{event.expectedParticipants} joining</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingBottom: 16 },
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
  filterBar: { paddingVertical: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.text },
  chipTextActive: { color: '#FFF' },
  stateBox: { padding: 40, alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
  stateTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 8 },
  stateText: { fontSize: 13, color: Colors.textLight, textAlign: 'center' },
  list: { padding: 16, paddingTop: 0, paddingBottom: 60 },
  monthBlock: { marginBottom: 20 },
  monthHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    opacity: 0.7,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cover: { width: '100%', height: 140, backgroundColor: '#eee' },
  body: { padding: 14, gap: 6 },
  kindRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kindBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  kindText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: 15, fontWeight: '700', color: Colors.text },
  description: { fontSize: 12, color: Colors.textLight, lineHeight: 18 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: Colors.textLight },
});
