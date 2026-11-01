/**
 * SearchInput Component
 * 
 * Reusable search input with debouncing
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import Colors from '@/constants/colors';

export interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  debounceMs?: number;
  onClear?: () => void;
}

export function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search...',
  debounceMs = 300,
  onClear,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  // Debounce handle lives in a ref, not state — putting it in state caused
  // an extra render per keystroke and, more importantly, the cleanup effect
  // couldn't see the pending timer to cancel it on unmount.
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local value in sync if the parent resets it externally.
  useEffect(() => { setLocalValue(value); }, [value]);

  // Cancel pending debounce on unmount so we don't call onChangeText on an
  // unmounted screen.
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleChange = useCallback(
    (text: string) => {
      setLocalValue(text);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        onChangeText(text);
        debounceTimerRef.current = null;
      }, debounceMs);
    },
    [onChangeText, debounceMs]
  );

  const handleClear = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setLocalValue('');
    onChangeText('');
    onClear?.();
  }, [onChangeText, onClear]);

  return (
    <View style={styles.container}>
      <Search size={20} color={Colors.textSecondary} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={localValue}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {localValue.length > 0 && (
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <X size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
});

export default SearchInput;
