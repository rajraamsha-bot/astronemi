/**
 * Kundli Dasha Display Component
 * Displays Vimshottari and Chara Dasha periods
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import type { DashaPeriod } from '@/utils/vedic-astrology';
import type { CharaDashaPeriod } from '@/utils/kundli-generator';

interface KundliDashaDisplayProps {
  vimshottariDasha?: DashaPeriod[];
  charaDasha?: CharaDashaPeriod[];
}

export const KundliDashaDisplay: React.FC<KundliDashaDisplayProps> = ({
  vimshottariDasha,
  charaDasha,
}) => {
  const Colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);

  return (
    <>
      {/* Vimshottari Dasha */}
      {vimshottariDasha && vimshottariDasha.length > 0 && (
        <View style={styles.infoCard}>
          <View style={styles.dashaHeader}>
            <TrendingUp size={20} color={Colors.primary} />
            <Text style={styles.infoTitle}>Vimshottari Dasha</Text>
          </View>
          {vimshottariDasha.slice(0, 5).map((dasha, idx) => (
            <View key={idx} style={styles.dashaRow}>
              <Text style={styles.dashaPlanet}>{dasha.planet}</Text>
              <Text style={styles.dashaDate}>
                {new Date(dasha.startDate).toLocaleDateString()} —{' '}
                {new Date(dasha.endDate).toLocaleDateString()}
              </Text>
              <Text style={styles.dashaYears}>
                {typeof dasha.years === 'number' ? dasha.years.toFixed(1) : dasha.years}y
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Chara Dasha (Jaimini) */}
      {charaDasha && charaDasha.length > 0 && (
        <View style={styles.infoCard}>
          <View style={styles.dashaHeader}>
            <TrendingUp size={20} color={Colors.purple} />
            <Text style={styles.infoTitle}>Chara Dasha (Jaimini)</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Sign-based dasha system unique to Jaimini</Text>
          {charaDasha.slice(0, 5).map((dasha, idx) => (
            <View
              key={idx}
              style={[styles.dashaRow, dasha.isCurrentDasha && styles.currentDashaRow]}
            >
              <Text style={[styles.dashaPlanet, dasha.isCurrentDasha && styles.currentDashaText]}>
                {dasha.sign}
                {dasha.isCurrentDasha ? ' ●' : ''}
              </Text>
              <Text style={styles.dashaDate}>
                {dasha.startDate.toLocaleDateString()} — {dasha.endDate.toLocaleDateString()}
              </Text>
              <Text style={styles.dashaYears}>{dasha.years}y</Text>
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
    dashaHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    infoTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: Colors.text,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: Colors.textLight,
      marginBottom: 12,
      fontStyle: 'italic',
    },
    dashaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: Colors.background,
      borderRadius: 8,
      marginBottom: 8,
    },
    currentDashaRow: {
      backgroundColor: Colors.primaryLight || '#e3f2fd',
      borderWidth: 2,
      borderColor: Colors.primary,
    },
    dashaPlanet: {
      fontSize: 14,
      fontWeight: '700',
      color: Colors.text,
      flex: 1,
    },
    currentDashaText: {
      color: Colors.primary,
    },
    dashaDate: {
      fontSize: 12,
      color: Colors.textLight,
      flex: 2,
      textAlign: 'center',
    },
    dashaYears: {
      fontSize: 13,
      fontWeight: '600',
      color: Colors.purple,
      flex: 0.5,
      textAlign: 'right',
    },
  });

export default KundliDashaDisplay;
