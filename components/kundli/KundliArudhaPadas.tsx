/**
 * Kundli Arudha Padas Component
 * Displays Jaimini Arudha Padas (material reflections)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import type { ArudhaPada } from '@/utils/kundli-generator';

interface KundliArudhaPadasProps {
  arudhaPadas?: ArudhaPada[];
  upapadaLagna?: {
    sign: string;
    lord: string;
    description: string;
  };
}

export const KundliArudhaPadas: React.FC<KundliArudhaPadasProps> = ({
  arudhaPadas,
  upapadaLagna,
}) => {
  const Colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);

  if (!arudhaPadas || arudhaPadas.length === 0) {
    return null;
  }

  return (
    <>
      {/* Arudha Padas */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>🌟 Arudha Padas (Jaimini)</Text>
        <Text style={styles.sectionSubtitle}>
          Reflection of houses in the material world
        </Text>
        {arudhaPadas.slice(0, 6).map((a, idx) => (
          <View key={idx} style={styles.arudhaRow}>
            <View style={styles.arudhaShortBadge}>
              <Text style={styles.arudhaShort}>{a.short}</Text>
            </View>
            <View style={styles.arudhaInfo}>
              <Text style={styles.arudhaSign}>{a.sign}</Text>
              <Text style={styles.arudhaDesc}>{a.description.split(' — ')[0]}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Upapada Lagna */}
      {upapadaLagna && (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>💍 Upapada Lagna (Marriage)</Text>
          <View style={styles.upapadaCard}>
            <Text style={styles.upapadaSign}>{upapadaLagna.sign}</Text>
            <Text style={styles.upapadaLord}>Lord: {upapadaLagna.lord}</Text>
            <Text style={styles.upapadaDesc}>{upapadaLagna.description}</Text>
          </View>
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
      marginBottom: 8,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: Colors.textLight,
      marginBottom: 12,
      fontStyle: 'italic',
    },
    arudhaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: Colors.background,
      borderRadius: 10,
      marginBottom: 8,
    },
    arudhaShortBadge: {
      width: 45,
      height: 45,
      borderRadius: 8,
      backgroundColor: Colors.purple,
      alignItems: 'center',
      justifyContent: 'center',
    },
    arudhaShort: {
      fontSize: 13,
      fontWeight: '800',
      color: Colors.white,
    },
    arudhaInfo: {
      flex: 1,
    },
    arudhaSign: {
      fontSize: 15,
      fontWeight: '700',
      color: Colors.primary,
      marginBottom: 2,
    },
    arudhaDesc: {
      fontSize: 12,
      color: Colors.textLight,
    },
    upapadaCard: {
      backgroundColor: Colors.background,
      padding: 16,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: Colors.purple,
    },
    upapadaSign: {
      fontSize: 20,
      fontWeight: '800',
      color: Colors.primary,
      marginBottom: 8,
    },
    upapadaLord: {
      fontSize: 14,
      fontWeight: '600',
      color: Colors.text,
      marginBottom: 8,
    },
    upapadaDesc: {
      fontSize: 13,
      color: Colors.textLight,
      lineHeight: 20,
    },
  });

export default KundliArudhaPadas;
