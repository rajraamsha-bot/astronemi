import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import { Sparkles, TrendingUp, Heart, Briefcase, Home, UserCircle } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { AI_CHATBOT_CONFIG } from '@/constants/app-config';
import { sanitizeInput } from '@/security-config';
import { Logger } from '@/services/logger';
import { AIChatServiceError, requestAIChat } from '@/services/ai-chatbot-service';
import { isAIFeaturesEnabled } from '@/config/ai-features';
import { getPersistentDeviceId } from '@/utils/device';
import { prefixedSecureId } from '@/utils/secure-random';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatHeader from '@/components/chat/ChatHeader';
import { ChatInput } from '@/components/shared/ChatInput';
import { QuickQuestions, QuickQuestion } from '@/components/shared/QuickQuestions';
import ErrorBoundary from '@/components/ErrorBoundary';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
  isTyping?: boolean;
}

export default function AIChatScreen() {
  if (!isAIFeaturesEnabled()) {
    return <Redirect href="/(tabs)" />;
  }
  return <AIChatScreenInner />;
}

function AIChatScreenInner() {
  const Colors = useAppTheme();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { user } = useAuth();

  // State
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: '1',
      text: "Namaste! 🙏 I'm AstroBot, your AI astrology assistant. Ask me anything about horoscopes, planetary positions, remedies, or guidance. How can I help you today?",
      sender: 'ai',
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEscalation, setShowEscalation] = useState(false);

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageCountRef = useRef(0);
  // Always-current snapshot of messages for building request bodies without
  // side-effects inside a state updater (which React may invoke twice).
  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending requests when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Quick questions configuration
  const quickQuestions = useMemo<QuickQuestion[]>(
    () => [
      {
        id: '1',
        text: "What's my horoscope today?",
        icon: <Sparkles size={14} color={Colors.primary} />,
      },
      {
        id: '2',
        text: 'Career guidance for this month',
        icon: <Briefcase size={14} color={Colors.primary} />,
      },
      {
        id: '3',
        text: 'Love and relationship advice',
        icon: <Heart size={14} color={Colors.primary} />,
      },
      {
        id: '4',
        text: 'Best time for new beginnings?',
        icon: <TrendingUp size={14} color={Colors.primary} />,
      },
      {
        id: '5',
        text: 'Vastu tips for home',
        icon: <Home size={14} color={Colors.primary} />,
      },
    ],
    [Colors.primary]
  );

  // Scroll to bottom helper
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  // Handle sending messages
  const handleSend = useCallback(
    async (text?: string) => {
      const rawText = text || inputText;
      const trimmedText = rawText.trim();

      // Input validation
      if (!trimmedText) {
        return; // Silent fail for empty messages
      }

      if (trimmedText.length > AI_CHATBOT_CONFIG.MESSAGE_CHAR_LIMIT) {
        Alert.alert(
          'Message Too Long',
          `Your message exceeds the ${AI_CHATBOT_CONFIG.MESSAGE_CHAR_LIMIT} character limit. Please shorten it.`
        );
        return;
      }

      // Sanitize input to prevent XSS or injection attacks
      const sanitizedText = sanitizeInput(trimmedText);
      if (sanitizedText !== trimmedText) {
        Alert.alert(
          'Invalid Input',
          'Your message contains invalid characters. Please revise your message.'
        );
        return;
      }

      if (!user) {
        Alert.alert('Login Required', 'Please login to chat with AstroBot.');
        return;
      }

      // Create user message
      const userMessage: Message = {
        id: prefixedSecureId(`user-${Date.now()}`, 6),
        text: sanitizedText,
        sender: 'user',
        timestamp: Date.now(),
      };

      // Abort any in-flight request before starting a new one — previously
      // the previous controller was overwritten while its request was still
      // running, and concurrent sends could interleave state.
      abortControllerRef.current?.abort();

      // Update UI immediately
      setMessages((prev) => [...prev, userMessage]);
      setInputText('');
      setIsTyping(true);
      scrollToBottom();

      // Snapshot the current conversation for the request body. Using the ref
      // avoids a side-effect inside a state updater (which React may invoke
      // twice in dev/StrictMode).
      const historySnapshot = [...messagesRef.current, userMessage];

      try {
        // Create new AbortController for this request
        abortControllerRef.current = new AbortController();

        const deviceId = await getPersistentDeviceId();

        // SECURITY FIX: Don't duplicate the user message - historySnapshot already includes it
        const content = await requestAIChat({
          messages: historySnapshot.map(message => ({
            role: message.sender === 'user' ? 'user' as const : 'assistant' as const,
            content: message.text,
          })),
          context: { user_name: user?.name || 'Friend' },
          deviceId,
        });

        // Clear the abort controller after successful response
        abortControllerRef.current = null;

        const aiResponse: Message = {
          id: prefixedSecureId(`ai-${Date.now()}`, 6),
          text: content,
          sender: 'ai',
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, aiResponse]);

        // Track AI interaction count and show escalation after 3 exchanges
        messageCountRef.current += 1;
        if (messageCountRef.current >= 3) {
          setShowEscalation(true);
        }
      } catch (err) {
        // Don't show error if request was aborted (component unmounted)
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        if (err instanceof AIChatServiceError && err.isLimitReached) {
          Alert.alert(
            'Limit Reached',
            'You have reached your AI message limit. Upgrade your plan for continued access.',
            [
              { text: 'Later', style: 'cancel' },
              { text: 'View Plans', onPress: () => router.push('/subscription') },
            ]
          );
          return;
        }

        Logger.error('AI Chat Error:', err);
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          text: "My cosmic connection is a bit weak. Please check your internet or try again in a moment.",
          sender: 'ai',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
        abortControllerRef.current = null;
        scrollToBottom();
      }
    },
    [inputText, messages, user, scrollToBottom]
  );

  // Memoized render functions
  const renderMessage = useCallback(
    ({ item }: { item: Message }) => <MessageBubble item={item} />,
    []
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const ListFooterComponent = useMemo(
    () =>
      isTyping ? (
        <View style={styles.typingContainer}>
          <View style={styles.typingDot} />
          <View style={[styles.typingDot, styles.typingDotDelay1]} />
          <View style={[styles.typingDot, styles.typingDotDelay2]} />
          <Text style={styles.typingText}>AstroBot is typing...</Text>
        </View>
      ) : null,
    [isTyping, styles]
  );

  const handleEscalateToHuman = useCallback(() => {
    Alert.alert(
      'Connect with Human Astrologer',
      'Get personalized, in-depth guidance from our verified astrologers. Chat starts at just ₹10/min.',
      [
        { text: 'Stay with AI', style: 'cancel' },
        { text: 'Find Astrologer', onPress: () => router.push('/astrologers') },
      ]
    );
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ChatHeader />

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={scrollToBottom}
          ListFooterComponent={ListFooterComponent}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
        />

        {showEscalation && (
          <View style={styles.escalationBanner}>
            <UserCircle size={20} color={Colors.primary} />
            <Text style={styles.escalationText}>
              Want deeper insights?
            </Text>
            <Text
              style={styles.escalationLink}
              onPress={handleEscalateToHuman}
            >
              Ask a human astrologer
            </Text>
          </View>
        )}

        <QuickQuestions questions={quickQuestions} onSelect={handleSend} disabled={isTyping} />

        <ChatInput
          value={inputText}
          onChangeText={setInputText}
          onSend={handleSend}
          placeholder="Ask me anything about astrology..."
          disabled={isTyping}
          isLoading={isTyping}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const createStyles = (Colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    messagesList: {
      padding: 16,
      paddingBottom: 8,
    },
    typingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingLeft: 40,
      paddingVertical: 8,
    },
    typingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: Colors.primary,
    },
    typingDotDelay1: {
      opacity: 0.7,
    },
    typingDotDelay2: {
      opacity: 0.4,
    },
    typingText: {
      fontSize: 12,
      color: Colors.textLight,
      fontStyle: 'italic',
      marginLeft: 4,
    },
    escalationBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: Colors.primary + '15',
      borderTopWidth: 1,
      borderTopColor: Colors.primary + '30',
    },
    escalationText: {
      fontSize: 13,
      color: Colors.text,
    },
    escalationLink: {
      fontSize: 13,
      color: Colors.primary,
      fontWeight: '700',
    },
  });
