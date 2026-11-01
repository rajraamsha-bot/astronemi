/**
 * Kundli Form Input Component
 * Birth details input form with validation
 */

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, Clock, MapPin } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/ThemeContext';

interface KundliFormInputProps {
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  errors: Record<string, string>;
  onNameChange: (text: string) => void;
  onDateChange: (text: string) => void;
  onTimeChange: (text: string) => void;
  onPlaceChange: (text: string) => void;
  onGenerate: () => void;
  loading: boolean;
}

export const KundliFormInput: React.FC<KundliFormInputProps> = ({
  name,
  birthDate,
  birthTime,
  birthPlace,
  errors,
  onNameChange,
  onDateChange,
  onTimeChange,
  onPlaceChange,
  onGenerate,
  loading,
}) => {
  const Colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Generate Your Kundli</Text>
      <Text style={styles.subtitle}>Enter your birth details for accurate predictions</Text>

      {/* Name Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          placeholder="Enter your full name"
          placeholderTextColor={Colors.textMuted}
          value={name}
          onChangeText={onNameChange}
          autoCapitalize="words"
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      </View>

      {/* Birth Date Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          <Calendar size={14} color={Colors.primary} /> Birth Date
        </Text>
        <TextInput
          style={[styles.input, errors.birthDate && styles.inputError]}
          placeholder="DD/MM/YYYY"
          placeholderTextColor={Colors.textMuted}
          value={birthDate}
          onChangeText={onDateChange}
          keyboardType="numeric"
          maxLength={10}
        />
        {errors.birthDate && <Text style={styles.errorText}>{errors.birthDate}</Text>}
      </View>

      {/* Birth Time Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          <Clock size={14} color={Colors.primary} /> Birth Time
        </Text>
        <TextInput
          style={[styles.input, errors.birthTime && styles.inputError]}
          placeholder="HH:MM (24-hour format)"
          placeholderTextColor={Colors.textMuted}
          value={birthTime}
          onChangeText={onTimeChange}
          keyboardType="numeric"
          maxLength={5}
        />
        {errors.birthTime && <Text style={styles.errorText}>{errors.birthTime}</Text>}
      </View>

      {/* Birth Place Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          <MapPin size={14} color={Colors.primary} /> Birth Place
        </Text>
        <TextInput
          style={[styles.input, errors.birthPlace && styles.inputError]}
          placeholder="City, Country"
          placeholderTextColor={Colors.textMuted}
          value={birthPlace}
          onChangeText={onPlaceChange}
          autoCapitalize="words"
        />
        {errors.birthPlace && <Text style={styles.errorText}>{errors.birthPlace}</Text>}
      </View>

      {/* Generate Button */}
      <TouchableOpacity
        style={[styles.generateButton, loading && styles.generateButtonDisabled]}
        onPress={onGenerate}
        disabled={loading}
        accessibilityLabel="Generate Kundli"
        accessibilityRole="button"
      >
        <Text style={styles.generateButtonText}>
          {loading ? 'Generating...' : 'Generate Kundli'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (Colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    formContainer: {
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: Colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: Colors.textLight,
      marginBottom: 24,
      textAlign: 'center',
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: Colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: Colors.white,
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: Colors.text,
    },
    inputError: {
      borderColor: Colors.error,
      borderWidth: 2,
    },
    errorText: {
      fontSize: 12,
      color: Colors.error,
      marginTop: 4,
      marginLeft: 4,
    },
    generateButton: {
      backgroundColor: Colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    generateButtonDisabled: {
      opacity: 0.6,
    },
    generateButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: Colors.white,
    },
  });

export default KundliFormInput;
