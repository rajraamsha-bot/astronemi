import { useState, useCallback, useRef, useEffect } from 'react';
import {
  sendMessage as requestAstroBotReply,
  generateEnhancedLocalResponse,
  AstroUser,
} from '@/services/ai-chatbot-service';
import { Logger } from '@/services/logger';
import { prefixedSecureId } from '@/utils/secure-random';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  feedback?: 'positive' | 'negative' | null;
}

export const useAIChat = (user: any) => {
  // Greeting message is computed from the current user so it refreshes
  // when the profile finishes loading after mount (M6 fix).
  const greeting: ChatMessage = {
    id: 'greet',
    role: 'model',
    content: `🙏 Namaste${user?.name ? `, ${user.name}` : ''}! I'm AstroBot, your AI-powered astrology guide.`,
    timestamp: new Date(0),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([greeting]);
  const [isTyping, setIsTyping] = useState(false);

  // Mirror messages in a ref so sendMessage can construct the AI history
  // from the latest state without needing `messages` in its deps array.
  // Fixes the C2 stale-closure bug where a burst of two rapid sends would
  // each read the same pre-burst snapshot, losing the first user message.
  const messagesRef = useRef<ChatMessage[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // In-flight mutex so a double-tap can't issue two concurrent sends even
  // when isTyping hasn't propagated to this render yet (H1 fix).
  const sendingRef = useRef(false);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sendingRef.current) return;
    sendingRef.current = true;
    setIsTyping(true);

    const userMessage: ChatMessage = {
      id: prefixedSecureId('chat', 12),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    // Functional update — guaranteed to append to whatever is current,
    // not to the snapshot captured when this callback was created (C2 fix).
    setMessages(prev => [...prev, userMessage]);
    messagesRef.current = [...messagesRef.current, userMessage];

    try {
      let responseText: string;

      try {
        const astroUser: AstroUser | null = user ? {
          birthDate: (user.birth_date || user.birthDate || '') as string,
          birthTime: (user.birth_time || user.birthTime || '') as string,
        } : null;
        // History sent to the AI excludes the in-flight user message —
        // the Edge Function receives the full thread via messagesRef.
        responseText = await requestAstroBotReply(trimmed, messagesRef.current, astroUser);
      } catch (apiError) {
        Logger.error('AI API error:', apiError);
        responseText = generateEnhancedLocalResponse(trimmed);
      }

      const aiResponse: ChatMessage = {
        id: prefixedSecureId('chat', 12),
        role: 'model',
        content: responseText,
        timestamp: new Date(),
      };
      setMessages(prev => {
        const next = [...prev, aiResponse];
        messagesRef.current = next;
        return next;
      });
    } catch (error) {
      Logger.error('Chat error:', error);
      const errorResponse: ChatMessage = {
        id: prefixedSecureId('chat', 12),
        role: 'model',
        content: 'I apologize, I encountered an issue. Please try again. 🙏',
        timestamp: new Date(),
      };
      setMessages(prev => {
        const next = [...prev, errorResponse];
        messagesRef.current = next;
        return next;
      });
    } finally {
      sendingRef.current = false;
      setIsTyping(false);
    }
    // `user` is read at call time; `messages` is not read directly anymore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const clearChat = useCallback(() => {
    setMessages([{
      id: prefixedSecureId('chat', 12),
      role: 'model',
      content: '🙏 Namaste! Starting a fresh conversation. How can I guide you today?',
      timestamp: new Date(),
    }]);
  }, []);

  const setFeedback = useCallback((id: string, feedback: 'positive' | 'negative') => {
    setMessages(prev => prev.map(msg =>
      msg.id === id ? { ...msg, feedback } : msg
    ));
  }, []);

  return { messages, isTyping, sendMessage, clearChat, setFeedback };
};
