/**
 * Kundli Insights Component
 * Displays key insights and Mangal Dosha warning
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lightbulb, AlertTriangle } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/ThemeContext';

interface KundliInsightsProps {
  insights?: string[];
  mangalDosha?: boolean;
}

export const KundliInsights: React.FC<KundliInsightsProps> = ({ insights, mangalDosha }) => {
  const Colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);

  return (
    <>
      {/* Mangal Dosha Warning */}
      {mangalDosha && (
        <View style={[styles.infoCard, styles.doshaCard]}>
          <View style={styles.doshaHeader}>
            <AlertTriangle size={24} color={Colors.error} />
            <Text style={styles.doshaTitle}>Mangal Dosha Detected</Text>
          </View>
          <Text style={styles.doshaText}>
            Mars is placed in a sensitive house (1, 2, 4, 7, 8, or 12). Vedic remedies are
            recommended before marriage. Consult an astrologer for personalized guidance.
          </Text>
        </View>
      )}

      {/* Key Insights */}
      {insights && insights.length > 0 && (
        <View style={styles.infoCard}>
          <View style={styles.insightsHeader}>
            <Lightbulb size={20} color={Colors.gold} />
            <Text style={styles.infoTitle}>Key Insights</Text>
          </View>
          {insights.map((insight, idx) => (
            <View key={idx} style={styles.insightRow}>
              <Text style={styles.insightBullet}>•</Text>
              <Text style={styles.insight}>{insight}</Text>
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
    doshaCard: {
      backgroundColor: Colors.errorLight || '#ffebee',
      borderWidth: 2,
      borderColor: Colors.error,
    },
    doshaHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    doshaTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: Colors.error,
    },
    doshaText: {
      fontSize: 14,
      color: Colors.text,
      lineHeight: 22,
    },
    insightsHeader: {
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
    insightRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 10,
      paddingLeft: 4,
    },
    insightBullet: {
      fontSize: 16,
      fontWeight: '700',
      color: Colors.primary,
      marginRight: 8,
      marginTop: 2,
    },
    insight: {
      flex: 1,
      fontSize: 14,
      color: Colors.text,
      lineHeight: 22,
    },
  });

export default KundliInsights;
