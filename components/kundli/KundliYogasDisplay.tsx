/**
 * Kundli Yogas Display Component
 * Displays Parashari and Jaimini yogas
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import type { YogaResult } from '@/utils/vedic-astrology';
import type { JaiminiYoga } from '@/utils/kundli-generator';

interface KundliYogasDisplayProps {
  parasharYogas?: YogaResult[];
  jaiminiYogas?: JaiminiYoga[];
}

const getStrengthColor = (
  strength: string,
  Colors: ReturnType<typeof useAppTheme>
): string => {
  switch (strength.toLowerCase()) {
    case 'strong':
      return Colors.success;
    case 'moderate':
      return Colors.warning;
    case 'weak':
      return Colors.textMuted;
    default:
      return Colors.textLight;
  }
};

export const KundliYogasDisplay: React.FC<KundliYogasDisplayProps> = ({
  parasharYogas,
  jaiminiYogas,
}) => {
  const Colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);

  return (
    <>
      {/* Parashari Yogas */}
      {parasharYogas && parasharYogas.length > 0 && (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>✨ Parashari Yogas</Text>
          {parasharYogas.map((yoga, idx) => (
            <View key={idx} style={styles.yogaCard}>
              <View style={styles.yogaHeader}>
                <Text style={styles.yogaName}>{yoga.name}</Text>
                <View
                  style={[
                    styles.strengthBadge,
                    { backgroundColor: getStrengthColor(yoga.strength, Colors) },
                  ]}
                >
                  <Text style={styles.strengthText}>{yoga.strength}</Text>
                </View>
              </View>
              <Text style={styles.yogaDescription}>{yoga.description}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Jaimini Yogas */}
      {jaiminiYogas && jaiminiYogas.length > 0 && (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🔮 Jaimini Yogas</Text>
          {jaiminiYogas.map((yoga, idx) => (
            <View key={idx} style={styles.yogaCard}>
              <View style={styles.yogaHeader}>
                <Text style={styles.yogaName}>{yoga.name}</Text>
                <View
                  style={[
                    styles.strengthBadge,
                    { backgroundColor: getStrengthColor(yoga.strength, Colors) },
                  ]}
                >
                  <Text style={styles.strengthText}>{yoga.strength}</Text>
                </View>
              </View>
              <Text style={styles.yogaDescription}>{yoga.description}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
};

const createStyles = (Colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    infoCard: {
      backgroundColor: Colors.white,
      padding: 16,
      borderRadius: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    infoTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: Colors.text,
      marginBottom: 12,
    },
    yogaCard: {
      backgroundColor: Colors.background,
      padding: 14,
      borderRadius: 12,
      marginBottom: 10,
    },
    yogaHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    yogaName: {
      fontSize: 16,
      fontWeight: '700',
      color: Colors.text,
      flex: 1,
    },
    strengthBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    strengthText: {
      fontSize: 11,
      fontWeight: '700',
      color: Colors.white,
    },
    yogaDescription: {
      fontSize: 13,
      color: Colors.textLight,
      lineHeight: 20,
    },
  });

export default KundliYogasDisplay;
