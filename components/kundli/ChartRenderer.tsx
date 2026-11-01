/**
 * ChartRenderer Component
 * 
 * Renders the Vedic astrology charts (Rashi, Navamsa, Drekkana)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface ChartRendererProps {
  title: string;
  centerLabel: string;
  getPlanets: (house: number) => string[];
}

// Standard chart layout for Vedic astrology charts
const CHART_LAYOUT = [
  [11, 0, 1, 2],
  [10, -1, -1, 3],
  [9, 8, 7, 6],
  [-1, -1, 5, 4]
];

export function ChartRenderer({ title, centerLabel, getPlanets }: ChartRendererProps) {
  const renderChartCell = (houseIndex: number, colIndex: number, rowIndex: number) => {
    if (houseIndex === -1) {
      // Center cell
      if (rowIndex === 1 && colIndex === 1) {
        return (
          <View key={colIndex} style={[styles.chartCenter, { flex: 2 }]}>
            <Text style={styles.chartCenterText}>।। ॐ ।।</Text>
            <Text style={styles.rashi}>{centerLabel}</Text>
          </View>
        );
      }
      return null;
    }

    const names = getPlanets(houseIndex + 1);
    return (
      <View key={colIndex} style={styles.chartCell}>
        <Text style={styles.houseNumber}>{houseIndex + 1}</Text>
        {names.map((name, idx) => (
          <Text key={idx} style={styles.planetText}>{name}</Text>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.chart}>
        {CHART_LAYOUT.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.chartRow}>
            {row.map((houseIndex, colIndex) => 
              renderChartCell(houseIndex, colIndex, rowIndex)
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  chart: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 8,
    overflow: 'hidden',
  },
  chartRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chartCell: {
    flex: 1,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  chartCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  chartCenterText: {
    fontSize: 20,
    color: Colors.primary,
    marginBottom: 4,
  },
  rashi: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  houseNumber: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textLight,
    position: 'absolute',
    top: 2,
    left: 4,
  },
  planetText: {
    fontSize: 9,
    color: Colors.text,
    textAlign: 'center',
  },
});

export default ChartRenderer;
