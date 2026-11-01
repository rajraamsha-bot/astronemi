/**
 * Kundli Planetary Positions Component
 * Displays planetary positions in signs and houses
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import type { KundliData } from '@/utils/kundli-generator';

interface KundliPlanetaryPositionsProps {
  planets: KundliData['planets'];
}

const getOrdinalSuffix = (num: number): string => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
};

export const KundliPlanetaryPositions: React.FC<KundliPlanetaryPositionsProps> = ({
  planets,
}) => {
  const Colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>Planetary Positions</Text>
      {planets.map((planet, idx) => (
        <View key={idx} style={styles.planetRow}>
          <Text style={styles.planetName}>
            {planet.name} ({planet.sanskritName}){planet.isRetrograde ? ' ®' : ''}
          </Text>
          <Text style={styles.planetSign}>{planet.sign}</Text>
          <Text style={styles.planetHouse}>
            {planet.house}
            {getOrdinalSuffix(planet.house)}
          </Text>
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
      marginBottom: 12,
    },
    planetRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    planetName: {
      fontSize: 14,
      fontWeight: '600',
      color: Colors.text,
      flex: 2,
    },
    planetSign: {
      fontSize: 14,
      fontWeight: '600',
      color: Colors.primary,
      flex: 1,
      textAlign: 'center',
    },
    planetHouse: {
      fontSize: 14,
      fontWeight: '600',
      color: Colors.purple,
      flex: 1,
      textAlign: 'right',
    },
  });

export default KundliPlanetaryPositions;
