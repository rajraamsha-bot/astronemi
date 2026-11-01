/**
 * Astrologer Session — live reply screen.
 *
 * The practitioner's view of an active consultation. Loads the message
 * history, subscribes to Realtime for the user's incoming messages, and sends
 * replies as the astrologer. Billing happens on the USER side (their per-minute
 * meter), so there is no charging logic here — this screen only handles the
 * conversation and ending the session.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Send, ArrowLeft, Clock } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { Logger } from '@/services/logger';
import {
  getConsultation,
  getMessages,
  sendMessage as persistMessage,
  subscribeToChatMessages,
  closeConsultation,
  getMyAstrologerProfile,
  markMessagesAsRead,
  type Consultation,
} from '@/services/chat';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'astrologer';
  timestamp: number;
}

const TERMINAL_CONSULTATION_STATUSES = new Set([
  'completed',
  'cancelled',
  'declined',
  'refunded',
]);

export default function AstrologerSessionScreen() {
  const { id: consultationId } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user, isHydrating } = useAuth();

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ended, setEnded] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const endingRef = useRef(false);

  // Protect route
  useEffect(() => {
    if (isHydrating) return;
    if (!user) router.replace('/login');
  }, [user, isHydrating]);

  // Load consultation, verify ownership, load history.
  useEffect(() => {
    const load = async () => {
      if (!consultationId || !user) return;
      try {
        const [con, profile, history] = await Promise.all([
          getConsultation(consultationId),
          getMyAstrologerProfile(user.id),
          getMessages(consultationId),
        ]);

        if (!con || !profile) {
          Logger.error('Astrologer session: missing consultation or profile');
          setLoading(false);
          return;
        }

        // Authorisation: this consultation must belong to this astrologer.
        if (con.astrologerId !== profile.id) {
          Alert.alert('Not authorised', 'This consultation is not assigned to you.');
          router.back();
          return;
        }

        setConsultation(con);
        setEnded(TERMINAL_CONSULTATION_STATUSES.has(String(con.status)));
        setMessages(history.map(m => ({
          id: m.id,
          text: m.message,
          sender: m.senderType,
          timestamp: m.createdAt.getTime(),
        })));
        const marked = await markMessagesAsRead(consultationId, 'astrologer');
        if (!marked) Logger.warn('Failed to mark client messages as read', { consultationId });
      } catch (err) {
        Logger.error('Astrologer session load failed', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [consultationId, user]);

  // Realtime: receive the user's messages.
  useEffect(() => {
    if (!consultationId || ended) return;
    const unsubscribe = subscribeToChatMessages(consultationId, (incoming) => {
      if (incoming.senderType === 'astrologer') return; // ignore our own echoes
      void markMessagesAsRead(consultationId, 'astrologer').then(marked => {
        if (!marked) Logger.warn('Failed to mark client messages as read', { consultationId });
      });
      setMessages(prev => {
        if (prev.some(m => m.id === incoming.id)) return prev;
        return [...prev, {
          id: incoming.id,
          text: incoming.message,
          sender: incoming.senderType,
          timestamp: incoming.createdAt.getTime(),
        }];
      });
    });
    return unsubscribe;
  }, [consultationId, ended]);

  // Simple elapsed timer for the astrologer's awareness (billing is user-side).
  useEffect(() => {
    if (ended) return;
    const t = setInterval(() => setElapsed(e => e + 1), 60000);
    return () => clearInterval(t);
  }, [ended]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !consultationId || !user || ended || isSending) return;

    setIsSending(true);
    try {
      // Wait for the server message before showing it or clearing the input.
      const saved = await persistMessage(consultationId, 'astrologer', user.id, text);
      if (!saved) {
        throw new Error('The message could not be saved.');
      }

      setMessages(prev => [...prev, {
        id: saved.id,
        text: saved.message,
        sender: saved.senderType,
        timestamp: saved.createdAt.getTime(),
      }]);
      setInputText('');
    } catch (err) {
      Logger.warn('Failed to persist astrologer message', err);
      setInputText(text);
      Alert.alert('Message not sent', 'Your reply could not be saved. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [inputText, consultationId, user, ended, isSending]);

  const handleEnd = useCallback(() => {
    Alert.alert('End session?', 'This will close the consultation for both of you.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End',
        style: 'destructive',
        onPress: async () => {
          if (!consultationId || endingRef.current) return;
          endingRef.current = true;
          try {
            const closed = await closeConsultation(consultationId);
            if (!closed) {
              Alert.alert('Unable to end session', 'The consultation is still active. Please try again.');
              return;
            }
            setEnded(true);
            router.back();
          } catch (err) {
            Logger.error('Failed to close astrologer session', err);
            Alert.alert('Unable to end session', 'The consultation is still active. Please try again.');
          } finally {
            endingRef.current = false;
          }
        },
      },
    ]);
  }, [consultationId, elapsed]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ color: Colors.primary, marginTop: 16, fontWeight: '600' }}>Loading session…</Text>
      </View>
    );
  }

  if (!consultation) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Consultation not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: Colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderMessage = ({ item }: { item: Message }) => (
    // From the astrologer's POV, THEIR messages are on the right.
    <View style={[styles.bubble, item.sender === 'astrologer' ? styles.mine : styles.theirs]}>
      <Text style={[styles.bubbleText, item.sender === 'astrologer' ? styles.mineText : styles.theirsText]}>
        {item.text}
      </Text>
      <Text style={[styles.time, item.sender === 'astrologer' ? styles.mineTime : styles.theirsTime]}>
        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerInner}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>Client session</Text>
            <View style={styles.elapsedRow}>
              <Clock size={12} color={Colors.white} />
              <Text style={styles.elapsedText}>{elapsed} min · {consultation.type}</Text>
            </View>
          </View>
          {!ended && (
            <TouchableOpacity style={styles.endBtn} onPress={handleEnd}>
              <Text style={styles.endBtnText}>End</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.input}
            placeholder={ended ? 'Session ended' : 'Type your reply…'}
            placeholderTextColor={Colors.textLight}
            value={inputText}
            onChangeText={setInputText}
            editable={!ended}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || ended) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || ended}
          >
            <Send size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary },
  headerInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '700', color: Colors.white },
  elapsedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  elapsedText: { fontSize: 12, color: Colors.white, opacity: 0.9 },
  endBtn: { backgroundColor: Colors.error, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  endBtnText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  list: { padding: 16, gap: 12 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  mine: { alignSelf: 'flex-end', backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: Colors.white, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  mineText: { color: Colors.white },
  theirsText: { color: Colors.text },
  time: { fontSize: 10, marginTop: 4 },
  mineTime: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  theirsTime: { color: Colors.textLight },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border, gap: 12 },
  input: { flex: 1, backgroundColor: Colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: Colors.text, maxHeight: 120 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
});
