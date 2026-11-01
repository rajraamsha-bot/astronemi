/**
 * VimshottariDasha Component
 * 
 * Displays Vimshottari Dasha periods - major time periods in Vedic astrology
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface VimshottariDashaProps {
  dashaPeriods: DashaPeriod[];
  limit?: number;
}

interface DashaPeriod {
  planet: string;
  startDate: string | Date;
  endDate: string | Date;
  years: number | string;
}

export function VimshottariDasha({ dashaPeriods, limit = 5 }: VimshottariDashaProps) {
  const displayDasha = dashaPeriods.slice(0, limit);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TrendingUp size={20} color={Colors.primary} />
        <Text style={styles.title}>Vimshottari Dasha</Text>
      </View>
      {displayDasha.map((dasha, idx) => (
        <View key={idx} style={styles.dashaRow}>
          <Text style={styles.dashaPlanet}>{dasha.planet}</Text>
          <Text style={styles.dashaDate}>
            {new Date(dasha.startDate).toLocaleDateString()} — {new Date(dasha.endDate).toLocaleDateString()}
          </Text>
          <Text style={styles.dashaYears}>
            {typeof dasha.years === 'number' ? dasha.years.toFixed(1) : dasha.years}y
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  dashaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  dashaPlanet: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  dashaDate: {
    fontSize: 11,
    color: Colors.textLight,
    flex: 2,
    textAlign: 'center',
  },
  dashaYears: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    minWidth: 40,
    textAlign: 'right',
  },
});

export default VimshottariDasha;
