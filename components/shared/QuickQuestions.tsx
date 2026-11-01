/**
 * Unified QuickQuestions Component
 * 
 * Consolidates ai-chat/QuickQuestions and chat/QuickQuestions into a single reusable component
 * with configurable props for different use cases.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Lightbulb } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/ThemeContext';

export interface QuickQuestion {
  id: string;
  text: string;
  icon?: React.ReactNode;
}

interface QuickQuestionsProps {
  questions: QuickQuestion[];
  onSelect: (question: string) => void;
  title?: string;
  showTitle?: boolean;
  horizontal?: boolean;
  /** Disable all tap targets (e.g. while a response is streaming in). */
  disabled?: boolean;
}

const QuickQuestionsComponent: React.FC<QuickQuestionsProps> = ({
  questions,
  onSelect,
  title = 'Quick Questions',
  showTitle = true,
  horizontal = true,
  disabled = false,
}) => {
  const Colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);

  const renderItem = React.useCallback(
    ({ item }: { item: QuickQuestion }) => (
      <TouchableOpacity
        style={[styles.questionButton, disabled && styles.questionButtonDisabled]}
        onPress={() => { if (!disabled) onSelect?.(item.text); }}
        disabled={disabled}
        accessibilityLabel={`Ask: ${item.text}`}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        {item.icon && <View style={styles.iconContainer}>{item.icon}</View>}
        <Text style={styles.questionText} numberOfLines={2}>
          {item.text}
        </Text>
      </TouchableOpacity>
    ),
    [onSelect, styles, disabled]
  );

  const keyExtractor = React.useCallback((item: QuickQuestion) => item.id, []);

  return (
    <View style={styles.container}>
      {showTitle && (
        <View style={styles.header}>
          <Lightbulb size={16} color={Colors.gold} />
          <Text style={styles.title}>{title}</Text>
        </View>
      )}
      <FlatList
        horizontal={horizontal}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        data={questions}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const createStyles = (Colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    container: {
      backgroundColor: Colors.white,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: Colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    title: {
      fontSize: 13,
      fontWeight: '600',
      color: Colors.textLight,
    },
    listContent: {
      paddingHorizontal: 12,
    },
    questionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.background,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 16,
      gap: 6,
      maxWidth: 200,
    },
    questionButtonDisabled: {
      opacity: 0.5,
    },
    iconContainer: {
      marginRight: 4,
    },
    questionText: {
      fontSize: 13,
      color: Colors.text,
      flexShrink: 1,
    },
    separator: {
      width: 8,
    },
  });

QuickQuestionsComponent.displayName = 'QuickQuestions';

export const QuickQuestions = React.memo(QuickQuestionsComponent);
export default QuickQuestions;
