/**
 * Kundli Nakshatra Details Component
 * Displays nakshatra information for key planets
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import type { KundliData } from '@/utils/kundli-generator';

interface KundliNakshatraDetailsProps {
  planets: KundliData['planets'];
}

export const KundliNakshatraDetails: React.FC<KundliNakshatraDetailsProps> = ({ planets }) => {
  const Colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);

  // Show nakshatra details for Sun, Moon, and Ascendant (first 3 planets)
  const keyPlanets = planets.slice(0, 3);

  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>Nakshatra Details</Text>
      {keyPlanets.map((planet, idx) => (
        <View key={idx} style={styles.nakshatraCard}>
          <Text style={styles.nakshatraPlanet}>{planet.name}</Text>
          <Text style={styles.nakshatraName}>
            {planet.nakshatra} (Pada {planet.nakshatraPada})
          </Text>
          <Text style={styles.nakshatraLord}>Lord: {planet.nakshatraLord}</Text>
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
    nakshatraCard: {
      backgroundColor: Colors.background,
      padding: 12,
      borderRadius: 12,
      marginBottom: 10,
      borderLeftWidth: 4,
      borderLeftColor: Colors.primary,
    },
    nakshatraPlanet: {
      fontSize: 16,
      fontWeight: '700',
      color: Colors.text,
      marginBottom: 4,
    },
    nakshatraName: {
      fontSize: 14,
      fontWeight: '600',
      color: Colors.primary,
      marginBottom: 4,
    },
    nakshatraLord: {
      fontSize: 13,
      color: Colors.textLight,
    },
  });

export default KundliNakshatraDetails;
