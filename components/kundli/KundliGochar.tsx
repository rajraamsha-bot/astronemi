import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Zap, ArrowUpRight, ArrowDownRight, Lock, Info } from 'lucide-react-native';
import { useAppTheme, AppTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/Card';
import { TransitPosition, TransitEffect } from '@/utils/transit-engine';

interface KundliGocharProps {
  transits?: {
    positions: TransitPosition[];
    effects: TransitEffect[];
  };
  isLocked?: boolean;
  onUpgrade?: () => void;
}

export const KundliGochar: React.FC<KundliGocharProps> = ({
  transits,
  isLocked,
  onUpgrade,
}) => {
  const Colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);

  if (isLocked) {
    return (
      <Card style={[styles.container, styles.lockedContainer]}>
        <View style={styles.header}>
          <Zap size={22} color={Colors.gold} fill={Colors.gold} />
          <Text style={[styles.title, { color: Colors.gold }]}>Today&apos;s Transit Impact</Text>
          <Lock size={16} color={Colors.gold} />
        </View>
        <Text style={styles.lockedText}>
          Where are the planets moving TODAY? Unlock real-time Gochar analysis to know how the stars are affecting your day.
        </Text>
        <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade}>
          <Text style={styles.upgradeBtnText}>Upgrade to Gold to Unlock</Text>
        </TouchableOpacity>
      </Card>
    );
  }

  if (!transits) return null;

  // Filter for major positive/negative effects to show on dashboard
  const significantEffects = transits.effects
    .filter(e => e.effect !== 'neutral')
    .slice(0, 4);

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Zap size={22} color={Colors.gold} fill={Colors.gold} />
          <Text style={styles.title}>Live Transit (Gochar)</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.pulse} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>Current planetary influence on your life:</Text>

      <View style={styles.effectsGrid}>
        {significantEffects.map((eff, idx) => (
          <View key={idx} style={styles.effectItem}>
            <View style={[styles.iconBox, { backgroundColor: eff.effect === 'positive' ? Colors.success + '15' : Colors.error + '15' }]}>
              {eff.effect === 'positive' ? (
                <ArrowUpRight size={18} color={Colors.success} />
              ) : (
                <ArrowDownRight size={18} color={Colors.error} />
              )}
            </View>
            <View style={styles.effectInfo}>
              <Text style={styles.planetInfo}>{eff.planet} Transit</Text>
              <Text style={styles.effectDesc} numberOfLines={2}>{eff.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Info size={14} color={Colors.textLight} />
        <Text style={styles.footerText}>
          Based on today&apos;s planetary positions relative to your natal chart.
        </Text>
      </View>
    </Card>
  );
};

const createStyles = (Colors: AppTheme) => StyleSheet.create({
  container: {
    marginBottom: 24,
    padding: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gold + '33',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.error + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.error,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.error,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 20,
  },
  effectsGrid: {
    gap: 12,
  },
  effectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  effectInfo: {
    flex: 1,
  },
  planetInfo: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  effectDesc: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    opacity: 0.7,
  },
  footerText: {
    fontSize: 11,
    color: Colors.textLight,
  },
  lockedContainer: {
    borderColor: Colors.gold + '66',
    backgroundColor: Colors.gold + '08',
    alignItems: 'center',
  },
  lockedText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  upgradeBtn: {
    backgroundColor: Colors.gold,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    shadowColor: Colors.gold,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  }
});
