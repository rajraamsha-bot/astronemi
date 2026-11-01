/**
 * Unified ChatInput Component
 * 
 * Consolidates ai-chat/ChatInput and chat/ChatInput into a single reusable component
 * with configurable props for different use cases.
 */

import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Send } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/ThemeContext';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  maxLength?: number;
  multiline?: boolean;
}

const ChatInputComponent: React.FC<ChatInputProps> = ({
  value,
  onChangeText,
  onSend,
  placeholder = 'Type a message...',
  disabled = false,
  isLoading = false,
  maxLength = 500,
  multiline = true,
}) => {
  const Colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);

  const canSend = value.trim().length > 0 && !disabled && !isLoading;

  const handleSend = React.useCallback(() => {
    if (canSend) {
      onSend();
    }
  }, [canSend, onSend]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          maxLength={maxLength}
          editable={!disabled && !isLoading}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!canSend}
          accessibilityLabel="Send message"
          accessibilityRole="button"
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Send size={20} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const createStyles = (Colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: Colors.white,
      borderTopWidth: 1,
      borderTopColor: Colors.border,
      gap: 8,
    },
    input: {
      flex: 1,
      backgroundColor: Colors.background,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: Colors.text,
      maxHeight: 100,
      minHeight: 40,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: Colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: {
      opacity: 0.5,
      backgroundColor: Colors.textMuted,
    },
  });

ChatInputComponent.displayName = 'ChatInput';

export const ChatInput = React.memo(ChatInputComponent);
export default ChatInput;
