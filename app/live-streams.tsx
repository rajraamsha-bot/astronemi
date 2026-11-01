/**
 * Live streams — reads scheduled and currently-live events from Supabase.
 * Users can set a reminder (which creates a row in
 * `live_stream_reminders`) or join a live session (navigates to the
 * existing Agora call screen using the stream's channel name).
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
  Bell,
  BellOff,
  Calendar,
  Circle,
  Clock,
  Users,
  Video as VideoIcon,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';
import {
  useLiveStreams,
  useToggleStreamReminder,
  useUserStreamReminders,
} from '@/hooks/queries/useLiveStreams';
import type { LiveStream } from '@/services/live-streams';

function minutesUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}

function formatSchedule(iso: string): string {
  const delta = minutesUntil(iso);
  if (delta <= 0) return 'Starting now';
  if (delta < 60) return `in ${delta} min`;
  if (delta < 60 * 24) return `in ${Math.round(delta / 60)} hr`;
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function LiveStreamsScreen() {
  const { user } = useUser();
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming'>('all');

  const { data: streams = [], isLoading, refetch, isRefetching } = useLiveStreams();
  const { data: reminders = [] } = useUserStreamReminders(user?.id);
  const toggleReminder = useToggleStreamReminder(user?.id);

  const reminderSet = useMemo(() => new Set(reminders), [reminders]);

  const filtered = useMemo(() => {
    if (filter === 'live') return streams.filter(s => s.isLive);
    if (filter === 'upcoming') return streams.filter(s => !s.isLive);
    return streams;
  }, [streams, filter]);

  const handleToggleReminder = (stream: LiveStream) => {
    if (!user) {
      Alert.alert('Sign in required', 'Sign in so we can notify you when the stream starts.');
      return;
    }
    toggleReminder.mutate(stream.id);
  };

  const handleJoin = (stream: LiveStream) => {
    if (!stream.isLive) return;
    if (!stream.channelName) {
      Alert.alert('Stream not ready', 'This stream has no channel yet. Please try again in a minute.');
      return;
    }
    // Reuse the existing call route for Agora playback.
    router.push(`/call/${stream.channelName}` as never);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#DC143C', '#E53935', '#EF5350']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerBar}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color="#FFF" size={22} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Live Streams</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.subtitle}>
            Sessions with our astrologers — live now and scheduled.
          </Text>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.filterRow}>
        {(['all', 'live', 'upcoming'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f === 'live' ? 'Live now' : 'Upcoming'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color="#E53935" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.stateBox}>
          <VideoIcon color={Colors.textLight} size={40} />
          <Text style={styles.stateTitle}>No streams right now</Text>
          <Text style={styles.stateText}>
            Check back later, or set a reminder when a session is scheduled.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={s => s.id}
          contentContainerStyle={styles.listContent}
          refreshing={isRefetching}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <StreamCard
              stream={item}
              reminded={reminderSet.has(item.id)}
              onToggleReminder={() => handleToggleReminder(item)}
              onJoin={() => handleJoin(item)}
            />
          )}
        />
      )}
    </View>
  );
}

function StreamCard({
  stream,
  reminded,
  onToggleReminder,
  onJoin,
}: {
  stream: LiveStream;
  reminded: boolean;
  onToggleReminder: () => void;
  onJoin: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.thumbWrap}>
        {stream.coverImage && (
          <Image source={{ uri: stream.coverImage }} style={styles.thumb} />
        )}
        {stream.isLive && (
          <View style={styles.liveTag}>
            <Circle color="#FFF" size={8} fill="#FFF" />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
        {!stream.isFree && (
          <View style={styles.paidTag}>
            <Text style={styles.paidText}>₹{stream.priceInr}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {stream.title}
        </Text>
        {stream.description && (
          <Text style={styles.description} numberOfLines={2}>
            {stream.description}
          </Text>
        )}

        <View style={styles.astroRow}>
          {stream.astrologerAvatar ? (
            <Image source={{ uri: stream.astrologerAvatar }} style={styles.astroAvatar} />
          ) : (
            <View style={[styles.astroAvatar, styles.astroAvatarFallback]} />
          )}
          <Text style={styles.astroName}>{stream.astrologerName ?? 'AstroNemi'}</Text>
        </View>

        <View style={styles.metaRow}>
          {stream.isLive ? (
            <View style={styles.metaItem}>
              <Users color={Colors.textLight} size={12} />
              <Text style={styles.metaText}>{stream.viewerCount} watching</Text>
            </View>
          ) : (
            <View style={styles.metaItem}>
              <Calendar color={Colors.textLight} size={12} />
              <Text style={styles.metaText}>{formatSchedule(stream.scheduledAt)}</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Clock color={Colors.textLight} size={12} />
            <Text style={styles.metaText}>{stream.durationMinutes} min</Text>
          </View>
        </View>

        {stream.isLive ? (
          <TouchableOpacity style={styles.joinButton} onPress={onJoin} accessibilityRole="button">
            <VideoIcon color="#FFF" size={16} />
            <Text style={styles.joinText}>Join live</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.reminderButton, reminded && styles.reminderButtonActive]}
            onPress={onToggleReminder}
            accessibilityRole="button"
            accessibilityLabel={reminded ? 'Turn off reminder' : 'Remind me'}
          >
            {reminded ? (
              <>
                <BellOff color="#FFF" size={16} />
                <Text style={styles.reminderText}>Reminder on</Text>
              </>
            ) : (
              <>
                <Bell color={Colors.primary} size={16} />
                <Text style={[styles.reminderText, { color: Colors.primary }]}>Remind me</Text>
              </>
            )}
          </TouchableOpacity>
        )}
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 12, paddingHorizontal: 16, marginTop: 8 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: '#E53935', borderColor: '#E53935' },
  filterText: { fontSize: 12, fontWeight: '600', color: Colors.text },
  filterTextActive: { color: '#FFF' },
  stateBox: { padding: 40, alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
  stateTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 8 },
  stateText: { fontSize: 13, color: Colors.textLight, textAlign: 'center' },
  listContent: { padding: 16 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumbWrap: { position: 'relative', backgroundColor: '#eee' },
  thumb: { width: '100%', height: 180 },
  liveTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E53935',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveText: { color: '#FFF', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  paidTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  paidText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  body: { padding: 14, gap: 8 },
  title: { fontSize: 15, fontWeight: '700', color: Colors.text },
  description: { fontSize: 12, color: Colors.textLight, lineHeight: 18 },
  astroRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  astroAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#eee' },
  astroAvatarFallback: { backgroundColor: Colors.primary },
  astroName: { fontSize: 12, fontWeight: '600', color: Colors.text },
  metaRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: Colors.textLight },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#E53935',
    marginTop: 4,
  },
  joinText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginTop: 4,
  },
  reminderButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  reminderText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
});
