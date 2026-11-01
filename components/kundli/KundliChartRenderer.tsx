/**
 * Kundli Chart Renderer Component
 * Renders Vedic astrology charts in North Indian diamond style
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';

interface KundliChartRendererProps {
  title: string;
  centerLabel: string;
  getPlanets: (house: number) => string[];
  subtitle?: string;
}

const CHART_LAYOUT = [
  [11, 0, 1, 2],
  [10, -1, -1, 3],
  [9, 8, 7, 6],
  [-1, -1, 5, 4],
];

export const KundliChartRenderer: React.FC<KundliChartRendererProps> = ({
  title,
  centerLabel,
  getPlanets,
  subtitle,
}) => {
  const Colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.chart}>
        {CHART_LAYOUT.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.chartRow}>
            {row.map((houseIndex, colIndex) => {
              if (houseIndex === -1) {
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
                  {names.map((n, i) => (
                    <Text key={i} style={styles.planetText}>
                      {n}
                    </Text>
                  ))}
                </View>
              );
            })}
          </View>
        ))}
      </View>
      {subtitle && <Text style={styles.chartSubtitle}>{subtitle}</Text>}
    </View>
  );
};

const createStyles = (Colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    chartContainer: {
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
    chartTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: Colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    chart: {
      aspectRatio: 1,
      borderWidth: 2,
      borderColor: Colors.primary,
      backgroundColor: Colors.background,
    },
    chartRow: {
      flex: 1,
      flexDirection: 'row',
    },
    chartCell: {
      flex: 1,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: 4,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: Colors.white,
    },
    chartCenter: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: Colors.primaryLight || '#e3f2fd',
    },
    chartCenterText: {
      fontSize: 16,
      fontWeight: '700',
      color: Colors.primary,
      marginBottom: 4,
    },
    rashi: {
      fontSize: 12,
      fontWeight: '600',
      color: Colors.primary,
    },
    houseNumber: {
      fontSize: 10,
      fontWeight: '700',
      color: Colors.textMuted,
      position: 'absolute',
      top: 2,
      left: 2,
    },
    planetText: {
      fontSize: 11,
      fontWeight: '600',
      color: Colors.text,
      textAlign: 'center',
    },
    chartSubtitle: {
      fontSize: 13,
      color: Colors.textLight,
      marginTop: 8,
      textAlign: 'center',
      fontStyle: 'italic',
    },
  });

export default KundliChartRenderer;
