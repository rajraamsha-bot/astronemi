/**
 * PlanetPositions Component
 * 
 * Displays planetary positions in the Kundli
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import { KundliData } from '@/utils/kundli-generator';

// Helper function for ordinal suffix
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return (s[(v - 20) % 10] || s[v] || s[0]) ?? '';
}

interface PlanetPositionsProps {
  kundliData: KundliData;
}

export function PlanetPositions({ kundliData }: PlanetPositionsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Planetary Positions</Text>
      {kundliData.planets.map((planet, idx) => (
        <View key={idx} style={styles.planetRow}>
          <Text style={styles.planetName}>
            {planet.name} ({planet.sanskritName}){planet.isRetrograde ? ' ®' : ''}
          </Text>
          <Text style={styles.planetSign}>{planet.sign}</Text>
          <Text style={styles.planetHouse}>
            {planet.house}{getOrdinalSuffix(planet.house)}
          </Text>
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
  planetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  planetName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  planetSign: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
    marginHorizontal: 8,
  },
  planetHouse: {
    fontSize: 14,
    color: Colors.textLight,
    minWidth: 40,
    textAlign: 'right',
  },
});

export default PlanetPositions;
