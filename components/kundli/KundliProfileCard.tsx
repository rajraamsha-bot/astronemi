/**
 * Kundli Profile Card Component
 * Displays user's birth information and ascendant details
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star, Zap, ShieldCheck } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import type { KundliData } from '@/utils/kundli-generator';

interface KundliProfileCardProps {
  kundliData: KundliData;
}

export const KundliProfileCard: React.FC<KundliProfileCardProps> = ({ kundliData }) => {
  const Colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.profileCard}>
      <Text style={styles.profileName}>{kundliData.personalInfo.name}</Text>
      <Text style={styles.profileInfo}>
        Born: {kundliData.personalInfo.dateTime.day}/{kundliData.personalInfo.dateTime.month}/
        {kundliData.personalInfo.dateTime.year} at{' '}
        {String(kundliData.personalInfo.dateTime.hour).padStart(2, '0')}:
        {String(kundliData.personalInfo.dateTime.minute).padStart(2, '0')}
      </Text>
      <Text style={styles.profileInfo}>
        📍 {kundliData.personalInfo.displayPlace ?? kundliData.personalInfo.birthPlace}
      </Text>
      <View style={styles.ascendantBadge}>
        <Star size={16} color={Colors.primary} fill={Colors.primary} />
        <Text style={styles.ascendantText}>
          Lagna: {kundliData.ascendant.sign} ({kundliData.ascendant.degree.toFixed(2)}°)
        </Text>
      </View>
      {kundliData.ayanamsa != null && (
        <Text style={styles.ayanamsaText}>
          Lahiri Ayanamsa: {kundliData.ayanamsa.toFixed(4)}°
        </Text>
      )}
      {kundliData.calculationSource === 'vedastro' && (
        <View style={styles.accuracyBadge}>
          <Zap size={14} color={Colors.success} fill={Colors.success} />
          <Text style={styles.accuracyText}>Swiss Ephemeris (VedAstro — Free)</Text>
        </View>
      )}

      {kundliData.precisionLevel === 'professional' && (
        <View style={styles.professionalBadge}>
          <ShieldCheck size={14} color={Colors.gold} fill={Colors.gold} />
          <Text style={styles.professionalText}>Professional Precision Engine (Placidus)</Text>
        </View>
      )}
      {kundliData.precisionLevel === 'standard' && (
        <View style={styles.standardBadge}>
          <ShieldCheck size={14} color={Colors.textLight} />
          <Text style={styles.standardText}>Standard Accuracy Engine (Equal Houses)</Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (Colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    profileCard: {
      backgroundColor: Colors.white,
      padding: 20,
      borderRadius: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    profileName: {
      fontSize: 24,
      fontWeight: '800',
      color: Colors.text,
      marginBottom: 8,
    },
    profileInfo: {
      fontSize: 14,
      color: Colors.textLight,
      marginBottom: 4,
    },
    ascendantBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: Colors.background,
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    ascendantText: {
      fontSize: 14,
      fontWeight: '600',
      color: Colors.primary,
    },
    ayanamsaText: {
      fontSize: 12,
      color: Colors.textMuted,
      marginTop: 8,
      fontStyle: 'italic',
    },
    accuracyBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: Colors.successLight || '#e8f5e9',
      borderRadius: 6,
      alignSelf: 'flex-start',
    },
    accuracyText: {
      fontSize: 11,
      fontWeight: '600',
      color: Colors.success,
    },
    fallbackBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: '#fff3e0',
      borderRadius: 6,
      alignSelf: 'flex-start',
    },
    fallbackText: {
      fontSize: 11,
      fontWeight: '600',
      color: Colors.warning,
    },
    professionalBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: Colors.gold + '15',
      borderRadius: 6,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: Colors.gold + '30',
    },
    professionalText: {
      fontSize: 11,
      fontWeight: '600',
      color: Colors.gold,
    },
    standardBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: Colors.background,
      borderRadius: 6,
      alignSelf: 'flex-start',
    },
    standardText: {
      fontSize: 11,
      fontWeight: '600',
      color: Colors.textLight,
    },
  });

export default KundliProfileCard;
