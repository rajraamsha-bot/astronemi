import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Bot, User } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
  isTyping?: boolean;
}

interface MessageBubbleProps {
  item: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ item }) => (
  <View style={[
    styles.messageBubble,
    item.sender === 'user' ? styles.userMessage : styles.aiMessage
  ]}>
    {item.sender === 'ai' && (
      <View style={styles.avatarContainer}>
        <View style={styles.aiAvatar}>
          <Bot size={16} color={Colors.white} />
        </View>
      </View>
    )}
    <View style={[
      styles.messageContent,
      item.sender === 'user' ? styles.userContent : styles.aiContent
    ]}>
      <Text style={[
        styles.messageText,
        item.sender === 'user' ? styles.userMessageText : styles.aiMessageText
      ]}>
        {item.text}
      </Text>
      <Text style={[
        styles.timestamp,
        item.sender === 'user' ? styles.userTimestamp : styles.aiTimestamp
      ]}>
        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
    {item.sender === 'user' && (
      <View style={styles.avatarContainer}>
        <View style={styles.userAvatar}>
          <User size={16} color={Colors.white} />
        </View>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  messageBubble: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
    gap: 8,
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  aiMessage: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 32,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageContent: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  userContent: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  aiContent: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: Colors.white,
  },
  aiMessageText: {
    color: Colors.text,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 6,
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  aiTimestamp: {
    color: Colors.textLight,
  },
});

export default MessageBubble;