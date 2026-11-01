/**
 * Astrology / Prediction Disclaimer
 *
 * HIGH-6 fix: ASCI (Advertising Standards Council of India) and
 * App Store / Play Store guidelines require that prediction content
 * in astrology apps carry a clear "entertainment purposes only"
 * disclaimer. This component is rendered on:
 *   - kundli (birth chart)
 *   - horoscope
 *   - consultation
 *   - any prediction / prediction-derived screen
 *
 * The component is small, unobtrusive, but always visible.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Info } from 'lucide-react-native';
import { AppTheme, useAppTheme } from '@/contexts/ThemeContext';

interface Props {
  variant?: 'banner' | 'inline' | 'footer';
  /**
   * Where the disclaimer is being shown. The wording is identical,
   * but consumers may want to know for analytics.
   */
  context?: string;
}

export const AstrologyDisclaimer: React.FC<Props> = ({ variant = 'inline', context }) => {
  const Colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(Colors, variant), [Colors, variant]);

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel="Disclaimer: Astrology content is for entertainment purposes only. Decisions of medical, legal, or financial importance should be made in consultation with a qualified professional."
      testID={`astrology-disclaimer${context ? `-${context}` : ''}`}
    >
      <Info size={14} color={Colors.textLight} style={styles.icon} />
      <Text style={styles.text}>
        For entertainment purposes only. AstroNemi does not provide medical, legal, or
        financial advice. Please consult a qualified professional for important life decisions.
      </Text>
    </View>
  );
};

const createStyles = (Colors: AppTheme, variant: 'banner' | 'inline' | 'footer') =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor:
        variant === 'banner' ? Colors.primaryLight : Colors.card,
      padding: variant === 'footer' ? 8 : 10,
      borderRadius: 6,
      marginVertical: variant === 'footer' ? 4 : 8,
      gap: 6,
    },
    icon: { marginTop: 2 },
    text: {
      flex: 1,
      fontSize: variant === 'footer' ? 10 : 11,
      color: Colors.textLight,
      lineHeight: variant === 'footer' ? 14 : 15,
    },
  });

export default AstrologyDisclaimer;
