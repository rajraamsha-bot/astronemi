import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Animated, ActivityIndicator, Alert, Modal } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, useLocalSearchParams, router, Stack } from 'expo-router';
import { Send, Phone, Video, ArrowLeft, Clock, IndianRupee, Sparkles, Star, Flag } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Logger } from '@/services/logger';
import { requestAIChat } from '@/services/ai-chatbot-service';
import {
  getConsultation,
  getAstrologer,
  getMessages,
  sendMessage as persistMessage,
  subscribeToChatMessages,
  markMessagesAsRead,
  endConsultation,
  rateConsultation,
  reportAstrologer,
  type Astrologer,
  type Consultation,
} from '@/services/chat';
import { debitConsultationMinute } from '@/services/wallet';
import { isAIFeaturesEnabled } from '@/config/ai-features';

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

const getTerminalNotice = (status: string): string => {
  if (status === 'declined') return 'This consultation was declined by the astrologer.';
  if (status === 'refunded') return 'This consultation was refunded and has ended.';
  if (status === 'cancelled') return 'This consultation was cancelled.';
  return 'This consultation has ended.';
};

export default function ChatScreen() {
  // NOTE: [id] is the CONSULTATION id (created during booking), not the astrologer id.
  const { id: consultationId } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user, isHydrating } = useAuth();

  const [astrologer, setAstrologer] = useState<Astrologer | null>(null);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // status drives the whole UI: waiting (human not yet accepted), active, ended
  const [status, setStatus] = useState<'waiting' | 'active' | 'ended'>('waiting');
  const [terminalNotice, setTerminalNotice] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [showRating, setShowRating] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');

  const flatListRef = useRef<FlatList>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const endedRef = useRef(false);
  const endingRef = useRef(false);
  const nextBillingMinuteRef = useRef(1);
  const billingInFlightRef = useRef(false);
  const sessionMinutesRef = useRef(0);
  const totalCostRef = useRef(0);

  const isAi = astrologer?.isAi ?? false;

  // For scheduled bookings, surface the booked slot instead of a generic
  // "waiting" state — the astrologer will connect at that time.
  const scheduledFor =
    consultation?.scheduledAt && consultation.scheduledAt.getTime() > Date.now()
      ? consultation.scheduledAt
      : null;

  const markConversationRead = useCallback(async () => {
    if (!consultationId || !user) return;
    try {
      const marked = await markMessagesAsRead(consultationId, 'user');
      if (!marked) Logger.warn('Failed to mark consultation messages as read', { consultationId });
    } catch (err) {
      Logger.warn('Failed to mark consultation messages as read', err);
    }
  }, [consultationId, user]);

  // Protect route
  useEffect(() => {
    if (isHydrating) return;
    if (!user) router.replace('/login');
  }, [user, isHydrating]);

  // ── Load consultation + astrologer + history + wallet ──────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!consultationId || !user) {
        if (!user) setLoading(false);
        return;
      }
      try {
        const con = await getConsultation(consultationId);
        if (cancelled) return;
        if (!con) {
          Logger.error('Consultation not found', { consultationId });
          setLoading(false);
          return;
        }
        setConsultation(con);
        const consultationStatus = String(con.status);
        if (consultationStatus === 'active') {
          setStatus('active');
          setTerminalNotice(null);
        } else if (TERMINAL_CONSULTATION_STATUSES.has(consultationStatus)) {
          setStatus('ended');
          setTerminalNotice(getTerminalNotice(consultationStatus));
        } else {
          setStatus('waiting');
          setTerminalNotice(null);
        }

        const [astro, history, walletRes] = await Promise.all([
          getAstrologer(con.astrologerId),
          getMessages(consultationId),
          supabase.from('users').select('wallet_balance').eq('id', user.id).single(),
        ]);
        if (cancelled) return;

        if (astro) setAstrologer(astro);
        if (walletRes.data) setWalletBalance(walletRes.data.wallet_balance ?? 0);

        const mapped: Message[] = history.map(m => ({
          id: m.id,
          text: m.message,
          sender: m.senderType,
          timestamp: m.createdAt.getTime(),
        }));

        // Seed a greeting if the thread is empty
        if (mapped.length === 0 && astro) {
          mapped.push({
            id: 'welcome',
            text: astro.isAi
              ? `Namaste! 🙏 I'm ${astro.name}. Ask me anything — share your birth details for the most accurate guidance.`
              : `Namaste! 🙏 You're connected with ${astro.name}. They will respond shortly.`,
            sender: 'astrologer',
            timestamp: Date.now(),
          });
        }
        setMessages(mapped);
        void markConversationRead();
      } catch (err) {
        if (!cancelled) Logger.error('Failed to load chat data', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [consultationId, user, markConversationRead]);

  // ── Realtime: incoming messages + consultation status ─────────────────────
  useEffect(() => {
    if (!consultationId || !user || status === 'ended') return;

    const unsubscribe = subscribeToChatMessages(consultationId, (incoming) => {
      void markConversationRead();
      // Ignore our own echoes (the saved server message is added by handleSend)
      if (incoming.senderType === 'user') return;
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

    // Poll consultation status so 'waiting' -> 'active' flips when the astrologer accepts.
    const statusPoll = setInterval(async () => {
      const con = await getConsultation(consultationId);
      if (!con) return;
      const consultationStatus = String(con.status);
      if (consultationStatus === 'active') {
        setStatus('active');
        setTerminalNotice(null);
      } else if (TERMINAL_CONSULTATION_STATUSES.has(consultationStatus)) {
        setTerminalNotice(getTerminalNotice(consultationStatus));
        setStatus('ended');
        clearInterval(statusPoll);
      }
    }, 4000);

    return () => {
      unsubscribe();
      clearInterval(statusPoll);
    };
  }, [consultationId, user?.id, status, markConversationRead]);

  // ── Single source of truth for billing: one per-minute meter while active ──
  const finishSession = useCallback(async (reason?: string): Promise<boolean> => {
    if (endedRef.current || endingRef.current) return false;
    if (!consultationId) {
      Alert.alert('Unable to end session', 'The consultation could not be identified.');
      return false;
    }

    endingRef.current = true;
    let ended = false;
    try {
      ended = await endConsultation(consultationId);
    } catch (err) {
      Logger.error('Failed to end consultation', err);
    } finally {
      endingRef.current = false;
    }

    if (!ended) {
      Alert.alert('Unable to end session', 'The session is still active. Please try again.');
      return false;
    }

    endedRef.current = true;
    setStatus('ended');
    setTerminalNotice(null);
    const endMessage: Message = {
      id: `end-${Date.now()}`,
      text: `${reason ? reason + '\n' : ''}Session ended. Duration: ${sessionMinutesRef.current} min · Total: ₹${totalCostRef.current}.`,
      sender: 'astrologer',
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, endMessage]);
    setShowRating(true);
    return true;
  }, [consultationId]);

  useEffect(() => {
    if (status !== 'active' || !astrologer || !user || !consultationId) return;
    // Never start the billing meter for an AI session in an AI-off build;
    // the render guard redirects, but effects run before that navigation.
    if (isAi && !isAIFeaturesEnabled()) return;

    const rate = astrologer.pricePerMinute || 20;

    // Pulse the LIVE badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    // The server owns the amount. The client supplies only the next
    // sequential minute so the RPC can enforce idempotency and pricing.
    let billingStopped = false;
    let billingInterval: ReturnType<typeof setInterval> | null = null;

    const billMinute = async () => {
      if (billingStopped || billingInFlightRef.current) return;
      const nextMinute = nextBillingMinuteRef.current;
      billingInFlightRef.current = true;
      try {
        const result = await debitConsultationMinute(
          user.id,
          consultationId,
          nextMinute,
          'consultation',
        );

        if (!result.success) {
          billingStopped = true;
          if (billingInterval) clearInterval(billingInterval);
          const ended = await finishSession(result.message || 'Payment could not be processed.');
          if (ended) {
            Alert.alert('Session Ended', result.message || 'Payment could not be processed.');
          }
          return;
        }

        // Advance even if the RPC reports alreadyProcessed. That response is
        // an idempotent acknowledgement, not a second charge.
        if (nextBillingMinuteRef.current === nextMinute) {
          nextBillingMinuteRef.current = nextMinute + 1;
        }
        if (billingStopped) return;
        setSessionMinutes(m => { const v = m + 1; sessionMinutesRef.current = v; return v; });
        setTotalCost(t => { const v = t + rate; totalCostRef.current = v; return v; });
        if (typeof result.newBalance === 'number' && Number.isFinite(result.newBalance)) {
          setWalletBalance(result.newBalance);
        }
      } catch (err) {
        Logger.error('Billing error', err);
        billingStopped = true;
        if (billingInterval) clearInterval(billingInterval);
        await finishSession('Payment error.');
      } finally {
        billingInFlightRef.current = false;
      }
    };

    billMinute();
    billingInterval = setInterval(billMinute, 60000);

    return () => {
      billingStopped = true;
      if (billingInterval) clearInterval(billingInterval);
      pulseAnim.setValue(1);
    };
  }, [status, astrologer, user, isAi, consultationId, finishSession, pulseAnim]);

  // ── Send a message ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !astrologer || !user || !consultationId) return;
    if (status === 'ended' || isSending) return;

    setIsSending(true);
    let delivered = false;
    try {
      // Wait for the server message before clearing input or showing a bubble.
      const saved = await persistMessage(consultationId, 'user', user.id, text);
      if (!saved) {
        throw new Error('The message could not be saved.');
      }

      const deliveredMessage: Message = {
        id: saved.id,
        text: saved.message,
        sender: saved.senderType,
        timestamp: saved.createdAt.getTime(),
      };
      setMessages(prev => [...prev, deliveredMessage]);
      setInputText('');
      delivered = true;

      // For a human consultation, you can type while waiting (queued); for AI
      // this starts the active meter only after the user message is persisted.
      if (status === 'waiting' && isAi) setStatus('active');

      // AI mode: call the edge function for the reply. Human mode: nothing
      // more — the astrologer replies via Realtime.
      if (isAi) {
        setIsTyping(true);
        try {
          const content = await requestAIChat({
            messages: [
              ...messages.map(m => ({
                role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
                content: m.text,
              })),
              { role: 'user', content: text },
            ],
            context: {
              user_name: user.name || 'Friend',
              astrologer_name: astrologer.name,
              specialization: astrologer.specializations.join(', '),
              expertise: astrologer.expertise,
            },
            consultationId,
            astrologerId: astrologer.id,
          });
          setMessages(prev => [...prev, {
            id: `ai-${Date.now()}`,
            text: content,
            sender: 'astrologer',
            timestamp: Date.now(),
          }]);
          void markConversationRead();
        } catch (err) {
          Logger.error('AI reply error', err);
          setMessages(prev => [...prev, {
            id: `err-${Date.now()}`,
            text: "I'm having trouble connecting to the stars right now. Please try again.",
            sender: 'astrologer',
            timestamp: Date.now(),
          }]);
        } finally {
          setIsTyping(false);
        }
      }
    } catch (err) {
      Logger.warn('Failed to persist user message', err);
      if (!delivered) {
        setInputText(text);
        Alert.alert('Message not sent', 'Your message could not be saved. Please try again.');
      }
    } finally {
      setIsSending(false);
    }
  };

  const submitChatReport = async (reason: string) => {
    if (!astrologer) return;
    const ok = await reportAstrologer(astrologer.id, reason, 'chat');
    Alert.alert(
      ok ? 'Report submitted' : 'Report failed',
      ok
        ? 'Thank you. Our moderation team will review this conversation.'
        : 'Failed to submit report. Please try again.',
    );
  };

  const handleReport = () => {
    if (!astrologer) return;
    Alert.alert(
      'Report conversation',
      'Choose a reason for reporting this conversation.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Harassment or abuse', onPress: () => { void submitChatReport('Harassment or abuse'); } },
        { text: 'Spam or scam', onPress: () => { void submitChatReport('Spam or scam'); } },
        { text: 'Inappropriate content', onPress: () => { void submitChatReport('Inappropriate content'); } },
      ],
    );
  };

  const submitRating = async () => {
    if (consultationId && ratingValue > 0) {
      await rateConsultation(consultationId, ratingValue, ratingComment.trim() || undefined);
    }
    setShowRating(false);
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ color: Colors.primary, marginTop: 16, fontWeight: '600' }}>Initializing…</Text>
      </View>
    );
  }

  if (isAi && !isAIFeaturesEnabled()) {
    return <Redirect href="/consultations" />;
  }

  if (!astrologer || !consultation) {
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
    <View style={[styles.messageBubble, item.sender === 'user' ? styles.userMessage : styles.astrologerMessage]}>
      <Text style={[styles.messageText, item.sender === 'user' ? styles.userMessageText : styles.astrologerMessageText]}>
        {item.text}
      </Text>
      <Text style={[styles.timestamp, item.sender === 'user' ? styles.userTimestamp : styles.astrologerTimestamp]}>
        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerInner}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>

          <View style={styles.profileImageContainer}>
            {isAi ? (
              <View style={[styles.headerImage, styles.aiAvatar]}>
                <Sparkles size={22} color={Colors.white} />
              </View>
            ) : (
              <Image source={{ uri: astrologer.avatarUrl || '' }} style={styles.headerImage} contentFit="cover" />
            )}
            {astrologer.isOnline && <View style={styles.headerOnlineDot} />}
          </View>

          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.headerName} numberOfLines={1}>{astrologer.name}</Text>
              {isAi && (
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>AI</Text>
                </View>
              )}
            </View>
            <View style={styles.statusRow}>
              {status === 'active' ? (
                <Animated.View style={[styles.liveBadge, { transform: [{ scale: pulseAnim }] }]}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </Animated.View>
              ) : status === 'waiting' ? (
                <Text style={styles.onlineStatus}>
                  {scheduledFor
                    ? `Scheduled · ${scheduledFor.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : isAi ? 'Ready' : 'Connecting…'}
                </Text>
              ) : (
                <Text style={styles.onlineStatus}>Ended</Text>
              )}
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleReport}
              accessibilityLabel="Report conversation"
            >
              <Flag size={18} color={Colors.white} />
            </TouchableOpacity>
            {!isAi && (
              <>
                <TouchableOpacity style={styles.headerButton} onPress={() => router.push(`/call/${consultationId}?type=audio`)}>
                  <Phone size={20} color={Colors.white} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerButton} onPress={() => router.push(`/call/${consultationId}?type=video`)}>
                  <Video size={20} color={Colors.white} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>

      {status === 'active' && (
        <View style={styles.sessionBar}>
          <View style={styles.sessionInfo}>
            <Clock size={16} color={Colors.white} />
            <Text style={styles.sessionText}>{sessionMinutes} min</Text>
          </View>
          <View style={styles.sessionInfo}>
            <IndianRupee size={16} color={Colors.white} />
            <Text style={styles.sessionText}>₹{totalCost}</Text>
          </View>
          <TouchableOpacity style={styles.endButton} onPress={() => finishSession()}>
            <Text style={styles.endButtonText}>End Session</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.rateBar}>
        <Text style={styles.rateText}>Rate: ₹{astrologer.pricePerMinute}/min</Text>
        <Text style={styles.balanceText}>Balance: ₹{walletBalance}</Text>
      </View>

      {status === 'waiting' && !isAi && (
        <View style={styles.waitingBanner}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.waitingText}>
            {scheduledFor
              ? `Scheduled for ${scheduledFor.toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}. ${astrologer.name} will connect at that time.`
              : `Waiting for ${astrologer.name} to accept…`}
          </Text>
        </View>
      )}

      {status === 'ended' && terminalNotice && (
        <View style={styles.waitingBanner}>
          <Text style={styles.waitingText}>{terminalNotice}</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListFooterComponent={isTyping ? (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>{astrologer.name} is typing...</Text>
          </View>
        ) : null}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.input}
            placeholder={status === 'ended' ? 'Session ended' : 'Type your message...'}
            placeholderTextColor={Colors.textLight}
            value={inputText}
            onChangeText={setInputText}
            editable={status !== 'ended'}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || status === 'ended' || isSending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || status === 'ended' || isSending}
          >
            <Send size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Post-session rating */}
      <Modal visible={showRating} transparent animationType="slide" onRequestClose={() => { setShowRating(false); router.back(); }}>
        <View style={styles.ratingOverlay}>
          <View style={styles.ratingCard}>
            <Text style={styles.ratingTitle}>Rate your session</Text>
            <Text style={styles.ratingSub}>with {astrologer.name}</Text>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setRatingValue(star)}>
                  <Star size={36} color={Colors.gold} fill={star <= ratingValue ? Colors.gold : 'transparent'} />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.ratingInput}
              placeholder="Share your experience (optional)"
              placeholderTextColor={Colors.textLight}
              value={ratingComment}
              onChangeText={setRatingComment}
              multiline
            />
            <TouchableOpacity style={styles.ratingSubmit} onPress={submitRating}>
              <Text style={styles.ratingSubmitText}>{ratingValue > 0 ? 'Submit' : 'Skip'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary },
  headerInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  profileImageContainer: { position: 'relative' },
  headerOnlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.primary },
  backButton: { padding: 4 },
  headerImage: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: Colors.white },
  aiAvatar: { backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerName: { fontSize: 16, fontWeight: '700', color: Colors.white },
  aiBadge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  aiBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.white, letterSpacing: 0.5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  onlineStatus: { fontSize: 12, color: Colors.white, opacity: 0.9 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.error, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.white },
  liveText: { fontSize: 10, fontWeight: '700', color: Colors.white },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  sessionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.success, paddingHorizontal: 16, paddingVertical: 10 },
  sessionInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sessionText: { fontSize: 14, fontWeight: '600', color: Colors.white },
  endButton: { backgroundColor: Colors.error, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  endButtonText: { fontSize: 12, fontWeight: '700', color: Colors.white },
  rateBar: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rateText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  balanceText: { fontSize: 13, fontWeight: '600', color: Colors.success },
  waitingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, backgroundColor: Colors.primary + '12' },
  waitingText: { fontSize: 13, color: Colors.text },
  messagesList: { padding: 16, gap: 12 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  userMessage: { alignSelf: 'flex-end', backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  astrologerMessage: { alignSelf: 'flex-start', backgroundColor: Colors.white, borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 22 },
  userMessageText: { color: Colors.white },
  astrologerMessageText: { color: Colors.text },
  timestamp: { fontSize: 10, marginTop: 4 },
  userTimestamp: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  astrologerTimestamp: { color: Colors.textLight },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border, gap: 12 },
  input: { flex: 1, backgroundColor: Colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: Colors.text, maxHeight: 100 },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { opacity: 0.5 },
  typingIndicator: { padding: 8, marginLeft: 4 },
  typingText: { fontSize: 12, color: Colors.textLight, fontStyle: 'italic' },
  ratingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  ratingCard: { backgroundColor: Colors.white, borderRadius: 20, padding: 24, alignItems: 'center' },
  ratingTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  ratingSub: { fontSize: 14, color: Colors.textLight, marginTop: 4, marginBottom: 16 },
  ratingStars: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  ratingInput: { width: '100%', minHeight: 70, backgroundColor: Colors.background, borderRadius: 12, padding: 12, fontSize: 14, color: Colors.text, textAlignVertical: 'top', marginBottom: 16 },
  ratingSubmit: { backgroundColor: Colors.primary, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 25 },
  ratingSubmitText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
