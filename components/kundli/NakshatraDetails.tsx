/**
 * NakshatraDetails Component
 * 
 * Displays nakshatra (birth star) details for planets
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import { KundliData } from '@/utils/kundli-generator';

interface NakshatraDetailsProps {
  kundliData: KundliData;
}

export function NakshatraDetails({ kundliData }: NakshatraDetailsProps) {
  // Show nakshatra details for first 3 planets (Sun, Moon, Mars typically)
  const planetsToShow = kundliData.planets.slice(0, 3);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nakshatra Details</Text>
      {planetsToShow.map((planet, idx) => (
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
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  nakshatraCard: {
    backgroundColor: '#F8F4FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  nakshatraPlanet: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  nakshatraName: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 2,
  },
  nakshatraLord: {
    fontSize: 12,
    color: Colors.textLight,
  },
});

export default NakshatraDetails;
