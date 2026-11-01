import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bot, User, Copy, ThumbsUp, ThumbsDown } from 'lucide-react-native';

interface ChatMessageProps {
  item: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    feedback?: 'positive' | 'negative' | null;
  };
  onCopy: (content: string) => void;
  onFeedback: (id: string, feedback: 'positive' | 'negative') => void;
}

const ChatMessageComponent = ({ item, onCopy, onFeedback }: ChatMessageProps) => (
  <View style={[styles.messageWrapper, item.role === 'user' ? styles.userWrapper : styles.assistantWrapper]}>
    <View style={[styles.avatar, item.role === 'user' ? styles.userAvatar : styles.assistantAvatar]}>
      {item.role === 'assistant' ? <Bot color="#FFF" size={16} /> : <User color="#FFF" size={16} />}
    </View>
    <View style={[styles.messageBubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
      <Text style={[styles.messageText, item.role === 'user' ? styles.userText : styles.assistantText]}>
        {item.content}
      </Text>
      <Text style={styles.timestamp}>
        {item.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </Text>
      {item.role === 'assistant' && (
        <View style={styles.messageActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onCopy(item.content)}>
            <Copy color="#999" size={14} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, item.feedback === 'positive' && styles.actionBtnActive]}
            onPress={() => onFeedback(item.id, 'positive')}
          >
            <ThumbsUp color={item.feedback === 'positive' ? '#6B46C1' : '#999'} size={14} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, item.feedback === 'negative' && styles.actionBtnActive]}
            onPress={() => onFeedback(item.id, 'negative')}
          >
            <ThumbsDown color={item.feedback === 'negative' ? '#E91E63' : '#999'} size={14} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  </View>
);

ChatMessageComponent.displayName = 'ChatMessage';

export const ChatMessage = React.memo(ChatMessageComponent);

const styles = StyleSheet.create({
  messageWrapper: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  userWrapper: { flexDirection: 'row-reverse' },
  assistantWrapper: { flexDirection: 'row' },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  userAvatar: { backgroundColor: '#E91E63' },
  assistantAvatar: { backgroundColor: '#6B46C1' },
  messageBubble: { maxWidth: '80%', borderRadius: 18, padding: 14 },
  userBubble: { backgroundColor: '#6B46C1', borderTopRightRadius: 4 },
  assistantBubble: { backgroundColor: '#FFF', borderTopLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  messageText: { fontSize: 14, lineHeight: 22 },
  userText: { color: '#FFF' },
  assistantText: { color: '#1A1A1A' },
  timestamp: { fontSize: 10, color: 'rgba(0,0,0,0.35)', marginTop: 6, textAlign: 'right' },
  messageActions: { flexDirection: 'row', gap: 12, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  actionBtn: { padding: 4 },
  actionBtnActive: { backgroundColor: '#F0EBFF', borderRadius: 6 },
});
