/**
 * AstrologerProBadge — small "AstroPro" or "AstroElite" pill rendered
 * on the astrologer's profile and listing cards.
 *
 * Usage:
 *   <AstrologerProBadge planSlug="pro" />
 *   <AstrologerProBadge planSlug="elite" />
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Crown, Sparkles } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/ThemeContext';

interface Props {
  planSlug: 'free' | 'pro' | 'elite';
  size?: 'sm' | 'md';
  /** When true, omits the icon (for tight spaces). */
  compact?: boolean;
}

const LABELS: Record<Props['planSlug'], string> = {
  free: '',
  pro: 'AstroPro',
  elite: 'AstroElite',
};

export const AstrologerProBadge: React.FC<Props> = ({ planSlug, size = 'sm', compact }) => {
  const Colors = useAppTheme();
  if (planSlug === 'free') return null;

  const color = planSlug === 'elite' ? '#D97706' : Colors.primary;
  const Icon = planSlug === 'elite' ? Crown : Sparkles;
  const fontSize = size === 'md' ? 11 : 10;
  const paddingV = size === 'md' ? 4 : 2;
  const paddingH = size === 'md' ? 8 : 6;

  return (
    <View
      style={[
        styles.badge,
        { borderColor: color, paddingVertical: paddingV, paddingHorizontal: paddingH },
      ]}
      accessibilityLabel={`${LABELS[planSlug]} astrologer`}
    >
      {!compact && <Icon size={fontSize + 2} color={color} />}
      <Text style={[styles.text, { color, fontSize, marginLeft: compact ? 0 : 4 }]}>
        {LABELS[planSlug]}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  text: { fontWeight: '800', letterSpacing: 0.4 },
});

export default AstrologerProBadge;
