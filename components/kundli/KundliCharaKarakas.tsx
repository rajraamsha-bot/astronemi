/**
 * Kundli Chara Karakas Component
 * Displays Jaimini Chara Karakas (soul significators)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import type { CharaKaraka } from '@/utils/kundli-generator';

interface KundliCharaKarakasProps {
  charaKarakas?: CharaKaraka[];
}

export const KundliCharaKarakas: React.FC<KundliCharaKarakasProps> = ({ charaKarakas }) => {
  const Colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);

  if (!charaKarakas || charaKarakas.length === 0) {
    return null;
  }

  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>🔮 Chara Karakas (Jaimini)</Text>
      <Text style={styles.sectionSubtitle}>
        Planets ranked by degree — the soul&apos;s cosmic roles
      </Text>
      {charaKarakas.map((k, idx) => (
        <View key={idx} style={styles.karakaRow}>
          <View style={styles.karakaBadge}>
            <Text style={styles.karakaBadgeText}>{k.karakaShort}</Text>
          </View>
          <View style={styles.karakaInfo}>
            <Text style={styles.karakaName}>
              {k.karaka}: <Text style={styles.karakaPlanet}>{k.planet}</Text>
            </Text>
            <Text style={styles.karakaDesc}>{k.description}</Text>
          </View>
        </View>
      ))}
    </View>
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
    karakaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: Colors.background,
      borderRadius: 12,
      marginBottom: 10,
    },
    karakaBadge: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: Colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    karakaBadgeText: {
      fontSize: 14,
      fontWeight: '800',
      color: Colors.white,
    },
    karakaInfo: {
      flex: 1,
    },
    karakaName: {
      fontSize: 15,
      fontWeight: '600',
      color: Colors.text,
      marginBottom: 4,
    },
    karakaPlanet: {
      color: Colors.primary,
      fontWeight: '700',
    },
    karakaDesc: {
      fontSize: 12,
      color: Colors.textLight,
      lineHeight: 18,
    },
  });

export default KundliCharaKarakas;
